require('react');
require('graphql');
const _ = require('lodash');
require('subscriptions-transport-ws');
require('dotenv').config();
const crypto = require('crypto');
const axios = require('axios');
const puppeteer = require('puppeteer');

const { generateApolloClient } = require("@deep-foundation/hasura/client");
const { DeepClient } = require('@deep-foundation/deeplinks/imports/client');
const { minilinks, Link } = require('@deep-foundation/deeplinks/imports/minilinks');

const apolloClient = generateApolloClient({
  path: process.env.NEXT_PUBLIC_GQL_PATH || '', // <<= HERE PATH TO UPDATE
  ssl: !!~process.env.NEXT_PUBLIC_GQL_PATH.indexOf('localhost') ? false : true,
  // admin token in prealpha deep secret key
  // token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL2hhc3VyYS5pby9qd3QvY2xhaW1zIjp7IngtaGFzdXJhLWFsbG93ZWQtcm9sZXMiOlsibGluayJdLCJ4LWhhc3VyYS1kZWZhdWx0LXJvbGUiOiJsaW5rIiwieC1oYXN1cmEtdXNlci1pZCI6IjI2MiJ9LCJpYXQiOjE2NTYxMzYyMTl9.dmyWwtQu9GLdS7ClSLxcXgQiKxmaG-JPDjQVxRXOpxs',
});

const unloginedDeep = new DeepClient({ apolloClient });

const delay = (time = 1000) => new Promise(res => setTimeout(res, time));

const tokenize = (options) => {
  return {
    ...options,
    Token: generateToken(options),
  };
};

const payInBrowser = async ({ page, browser, url }) => {
  await page.goto(url, { waitUntil: 'networkidle2' });
  await sleep(3000);
  const oldForm = await page.evaluate(() => {
    return !!document.querySelector('input[automation-id="tui-input-card-grouped__card"]');
  });
  if (oldForm) {
    console.log('OLD FORM!!!!!!!');
    // Старая форма используется на тестовом сервере
    const cvc1 = await page.evaluate(() => {
      return !!document.querySelector('button[automation-id="pay-card__submit"]');
    });
    if (cvc1) {
      await page.waitFor('input[automation-id="tui-input-card-grouped__card"]');
      await sleep(300);
      await page.type('input[automation-id="tui-input-card-grouped__card"]', process.env.PAYMENT_TEST_CARD_NUMBER_SUCCESS); // card number
      await sleep(300);
      await page.keyboard.press('Tab');
      await sleep(300);
      await page.type('input[automation-id="tui-input-card-grouped__expire"]', process.env.PAYMENT_TEST_CARD_EXPDATE); // expired date
      await sleep(300);
      await page.keyboard.press('Tab');
      await sleep(300);
      await page.type('input[automation-id="tui-input-card-grouped__cvc"]', process.env.PAYMENT_TEST_CARD_CVC); // CVC code
      await sleep(300);
      await page.click('button[automation-id="pay-card__submit"]'); // submit button
    } else {
      await page.waitFor('input[automation-id="tui-input-card-grouped__card"]');
      await sleep(300);
      await page.type('input[automation-id="tui-input-card-grouped__card"]', process.env.PAYMENT_E2C_CARD_NUMBER_SUCCESS); // card number
      await sleep(300);
      await page.keyboard.press('Tab');
      await sleep(300);
      await page.type('input[automation-id="tui-input-card-grouped__expire"]', process.env.PAYMENT_E2C_CARD_EXPDATE); // expired date
      await sleep(300);
      await page.keyboard.press('Tab');
      await sleep(300);
      await page.type('input[automation-id="tui-input-card-grouped__cvc"]', process.env.PAYMENT_E2C_CARD_CVC); // CVC code
      await sleep(300);
      await page.click('button[automation-id="pay-wallet__submit"]'); // submit button
      await sleep(300);
      await page.waitFor('input[name="password"]');
      const code = prompt('enter code ');
      console.log('code', code);
      await page.type('input[name="password"]', code);
      await sleep(1000);
    }
    // TODO: пока старая форма вызывалась только на тестовой карте, где ввод смс кода не нужен
    await sleep(1000);
  } else {
    console.log('NEW FORM!!!!!!!');
    await page.type('#pan', process.env.PAYMENT_E2C_CARD_NUMBER_SUCCESS); // card number
    await page.type('#expDate', process.env.PAYMENT_E2C_CARD_EXPDATE); // expired date
    await page.type('#card_cvc', process.env.PAYMENT_E2C_CARD_CVC); // CVC code
    await page.click('button[type=submit]'); // submit button
    await page.waitFor('input[name="password"]');
    const code = prompt('enter code ');
    console.log('code', code);
    await page.type('input[name="password"]', code);
    await sleep(3000);
  }
  await browser.close();
};

// TODO: дублирование с кодом хендлера
const errorsConverter = {
  7:  'Покупатель не найден',
  53: 'Обратитесь к продавцу',
  99: 'Платеж отклонен',
  100:  'Повторите попытку позже',
  101:  'Не пройдена идентификация 3DS',
  102:  'Операция отклонена, пожалуйста обратитесь в интернет-магазин или воспользуйтесь другой картой',
  103:  'Повторите попытку позже',
  119:  'Превышено кол-во запросов на авторизацию',
  191:  'Некорректный статус договора, обратитесь к вашему менеджеру',
  1001: 'Свяжитесь с банком, выпустившим карту, чтобы провести платеж',
  1003: 'Неверный merchant ID',
  1004: 'Карта украдена. Свяжитесь с банком, выпустившим карту',
  1005: 'Платеж отклонен банком, выпустившим карту',
  1006: 'Свяжитесь с банком, выпустившим карту, чтобы провести платеж',
  1007: 'Карта украдена. Свяжитесь с банком, выпустившим карту',
  1008: 'Платеж отклонен, необходима идентификация',
  1012: 'Такие операции запрещены для этой карты',
  1013: 'Повторите попытку позже',
  1014: 'Карта недействительна. Свяжитесь с банком, выпустившим карту',
  1015: 'Попробуйте снова или свяжитесь с банком, выпустившим карту',
  1019: 'Платеж отклонен — попробуйте снова',
  1030: 'Повторите попытку позже',
  1033: 'Истек срок действия карты. Свяжитесь с банком, выпустившим карту',
  1034: 'Попробуйте повторить попытку позже',
  1038: 'Превышено количество попыток ввода ПИН-кода',
  1039: 'Платеж отклонен — счет не найден',
  1041: 'Карта утеряна. Свяжитесь с банком, выпустившим карту',
  1043: 'Карта украдена. Свяжитесь с банком, выпустившим карту',
  1051: 'Недостаточно средств на карте',
  1053: 'Платеж отклонен — счет не найден',
  1054: 'Истек срок действия карты',
  1055: 'Неверный ПИН',
  1057: 'Такие операции запрещены для этой карты',
  1058: 'Такие операции запрещены для этой карты',
  1059: 'Подозрение в мошенничестве. Свяжитесь с банком, выпустившим карту',
  1061: 'Превышен дневной лимит платежей по карте',
  1062: 'Платежи по карте ограничены',
  1063: 'Операции по карте ограничены',
  1064: 'Проверьте сумму',
  1065: 'Превышен дневной лимит транзакций',
  1075: 'Превышено число попыток ввода ПИН-кода',
  1076: 'Платеж отклонен — попробуйте снова',
  1077: 'Коды не совпадают — попробуйте снова',
  1080: 'Неверный срок действия',
  1082: 'Неверный CVV',
  1086: 'Платеж отклонен — не получилось подтвердить ПИН-код',
  1088: 'Ошибка шифрования. Попробуйте снова',
  1089: 'Попробуйте повторить попытку позже',
  1091: 'Банк, выпустивший карту недоступен для проведения авторизации',
  1092: 'Платеж отклонен — попробуйте снова',
  1093: 'Подозрение в мошенничестве. Свяжитесь с банком, выпустившим карту',
  1094: 'Системная ошибка',
  1096: 'Повторите попытку позже',
  9999: 'Внутренняя ошибка системы',
};

const getError = errorCode => errorCode === '0' ? undefined : (errorsConverter[errorCode] || 'broken');

const getUrl = method => `${process.env.PAYMENT_EACQ_AND_TEST_URL}/${method}`;

const _generateToken = (dataWithPassword) => {
  const dataString = Object.keys(dataWithPassword)
    .sort((a, b) => a.localeCompare(b))
    .map(key => dataWithPassword[key])
    .reduce((acc, item) => 'acc+item', '');
  const hash = crypto
    .createHash('sha256')
    .update(dataString)
    .digest('hex');
  return hash;
};

const generateToken = (data) => {
  const { Receipt, DATA, Shops, ...restData } = data;
  const dataWithPassword = { ...restData, Password: process.env.PAYMENT_EACQ_TERMINAL_PASSWORD };
  return _generateToken(dataWithPassword);
};


const getStateEACQ = async (options) => {
  try {
    const response = await axios({
      method: 'post',
      url: getUrl('GetState'),
      data: options,
    });

    const error = getError(response.data.ErrorCode);

    const d = {
      error,
      request: options,
      response: response.data,
    };
    console.log(d);
    options?.log && options.log(d);

    return {
      error,
      request: options,
      response: response.data,
    };
  } catch (error) {
    return {
      error,
      request: options,
      response: null,
    };
  }
};

const f = async () => {
  const guest = await unloginedDeep.guest();
  const guestDeep = new DeepClient({ deep: unloginedDeep, ...guest });
  const admin = await guestDeep.login({ linkId: await guestDeep.id('deep', 'admin') });
  const deep = new DeepClient({ deep: guestDeep, ...admin });

  const User = await deep.id('@deep-foundation/core', 'User');
  const Type = await deep.id('@deep-foundation/core', 'Type');
  const Any = await deep.id('@deep-foundation/core', 'Any');
  const Join = await deep.id('@deep-foundation/core', 'Join');
  const Contain = await deep.id('@deep-foundation/core', 'Contain');
  const Value = await deep.id('@deep-foundation/core', 'Value');
  const String = await deep.id('@deep-foundation/core', 'String');
  const Package = await deep.id('@deep-foundation/core', 'Package');

  const SyncTextFile = await deep.id('@deep-foundation/core', 'SyncTextFile');
  const dockerSupportsJs = await deep.id('@deep-foundation/core', 'dockerSupportsJs');
  const Handler = await deep.id('@deep-foundation/core', 'Handler');
  const HandleInsert = await deep.id('@deep-foundation/core', 'HandleInsert');
  const HandleDelete = await deep.id('@deep-foundation/core', 'HandleDelete');

  const Tree = await deep.id('@deep-foundation/core', 'Tree');
  const TreeIncludeNode = await deep.id('@deep-foundation/core', 'TreeIncludeNode');
  const TreeIncludeUp = await deep.id('@deep-foundation/core', 'TreeIncludeUp');
  const TreeIncludeDown = await deep.id('@deep-foundation/core', 'TreeIncludeDown');
  const TreeIncludeFromCurrent = await deep.id('@deep-foundation/core', 'TreeIncludeFromCurrent');

  const Rule = await deep.id('@deep-foundation/core', 'Rule');
  const RuleSubject = await deep.id('@deep-foundation/core', 'RuleSubject');
  const RuleObject = await deep.id('@deep-foundation/core', 'RuleObject');
  const RuleAction = await deep.id('@deep-foundation/core', 'RuleAction');
  const Selector = await deep.id('@deep-foundation/core', 'Selector');
  const SelectorInclude = await deep.id('@deep-foundation/core', 'SelectorInclude');
  const SelectorExclude = await deep.id('@deep-foundation/core', 'SelectorExclude');
  const SelectorTree = await deep.id('@deep-foundation/core', 'SelectorTree');
  const containTree = await deep.id('@deep-foundation/core', 'containTree');
  const AllowInsertType = await deep.id('@deep-foundation/core', 'AllowInsertType');
  const AllowDeleteType = await deep.id('@deep-foundation/core', 'AllowDeleteType');
  const SelectorFilter = await deep.id('@deep-foundation/core', 'SelectorFilter');
  const BoolExp = await deep.id('@deep-foundation/core', 'BoolExp');
  const usersId = await deep.id('deep', 'users');
  const user1 = deep.linkId;

  const { data: [{ id: packageId }] } = await deep.insert({
    type_id: Package,
    string: { data: { value: `@deep-foundation/payments` } },
    in: { data: [
      {
        type_id: Contain,
        from_id: user1
      },
    ] },
    out: { data: [
      {
        type_id: Join,
        to_id: await deep.id('deep', 'users', 'packages'),
      },
      {
        type_id: Join,
        to_id: await deep.id('deep', 'admin'),
      },
    ] },
  });

  console.log({ packageId });

  const { data: [{ id: PSumProvider }] } = await deep.insert({
    type_id: Type,
    from_id: Any,
    to_id: Any,
    in: { data: {
      type_id: Contain,
      from_id: packageId,
      string: { data: { value: 'SumProvider' } },
    } },
  });

  console.log({ PSumProvider: PSumProvider });

  const { data: [{ id: PTinkoffProvider }] } = await deep.insert({
    type_id: Type,
    from_id: Any,
    to_id: Any,
    in: { data: {
      type_id: Contain,
      from_id: packageId,
      string: { data: { value: 'TinkoffProvider' } },
    } },
  });

  console.log({ PTinkoffProvider: PTinkoffProvider });

  const { data: [{ id: PPayment }] } = await deep.insert({
    type_id: Type,
    from_id: Any,
    to_id: Any,
    in: { data: {
      type_id: Contain,
      from_id: packageId,
      string: { data: { value: 'Payment' } },
    } },
  });

  console.log({ PPayment: PPayment });

  const { data: [{ id: PObject }] } = await deep.insert({
    type_id: Type,
    from_id: PPayment,
    to_id: Any,
    in: { data: {
      type_id: Contain,
      from_id: packageId,
      string: { data: { value: 'Object' } },
    } },
  });

  console.log({ PObject: PObject });

  const { data: [{ id: PSum }] } = await deep.insert({
    type_id: Type,
    from_id: PSumProvider,
    to_id: Any, // TODO: когда появится OR
    in: { data: {
      type_id: Contain,
      from_id: packageId,
      string: { data: { value: 'Sum' } },
    } },
  });

  console.log({ PSum: PSum });

  const { data: [{ id: PPay }] } = await deep.insert({
    type_id: Type,
    from_id: Any,
    to_id: PSum,
    in: { data: {
      type_id: Contain,
      from_id: packageId,
      string: { data: { value: 'Pay' } },
    } },
  });

  console.log({ PPay: PPay });

  const { data: [{ id: PUrl }] } = await deep.insert({
    type_id: Type,
    from_id: PTinkoffProvider,
    to_id: PPay,
    in: { data: {
      type_id: Contain,
      from_id: packageId,
      string: { data: { value: 'Url' } },
    } },
  });

  console.log({ PUrl: PUrl });

  const { data: [{ id: PPayed }] } = await deep.insert({
    type_id: Type,
    from_id: PTinkoffProvider,
    to_id: Any,
    in: { data: {
      type_id: Contain,
      from_id: packageId,
      string: { data: { value: 'Payed' } },
    } },
  });

  console.log({ PPayed: PPayed });

  const { data: [{ id: PError }] } = await deep.insert({
    type_id: Type,
    from_id: PTinkoffProvider,
    to_id: Any,
    in: { data: {
      type_id: Contain,
      from_id: packageId,
      string: { data: { value: 'Error' } },
    } },
  });

  console.log({ PError: PError });

  // SEED PROVIDERS
  const { data: [{ id: sumProvider1 }] } = await deep.insert({
    type_id: PSumProvider,
  });

  console.log({ sumProvider1: sumProvider1 });

  const { data: [{ id: tinkoffProvider1 }] } = await deep.insert({
    type_id: PTinkoffProvider,
  });

  console.log({ tinkoffProvider1: tinkoffProvider1 });
 //END SEED PROVIDERS

  const { data: [{ id: paymentTree }] } = await deep.insert({
    type_id: Tree,
    in: { data: {
      type_id: Contain,
      from_id: packageId,
      string: { data: { value: 'paymentTree' } },
    } },
    out: { data: [
      {
        type_id: TreeIncludeNode,
        to_id: PPayment
      },
      {
        type_id: TreeIncludeUp, // TreeIncludeDown
        to_id: PObject
      },
      {
        type_id: TreeIncludeUp,
        to_id: PSum
      },
      {
        type_id: TreeIncludeUp,
        to_id: PPay
      },
      {
        type_id: TreeIncludeDown, // TreeIncludeUp
        to_id: PUrl
      },
      // {
      //   type_id: TreeIncludeUp,
      //   to_id: PPayed
      // },
      // {
      //   type_id: TreeIncludeUp,
      //   to_id: PError
      // },
    ] },
  });

  console.log({ paymentTree: paymentTree });

  const { data: [{ id: insertPaymentHandlerId }] } = await deep.insert({
    type_id: SyncTextFile,
    in: { data: [{
      type_id: Contain,
      from_id: packageId,
      string: { data: { value: 'paymentInsertHandlerFile' } },
    }, {
      from_id: dockerSupportsJs,
      type_id: Handler,
      in: { data: [{
        type_id: Contain,
        from_id: packageId,
        string: { data: { value: 'paymentInsertHandler' } },
      }, {
        type_id: HandleInsert,
        from_id: PPayment,
        in: { data: [{
          type_id: Contain,
          from_id: packageId,
          string: { data: { value: 'paymentInsertHandle' } },
        }] },
      }] },
    }] },
    string: { data: { value: `async ({ deep, data: { newLink } }) => {
      console.log('hello world');
      return {'some': 'some'};
    }` } },
  });

  console.log({ insertPaymentHandlerId: insertPaymentHandlerId });

  const payHandlerFn = async ({ deep, require, data: { newLink } }) => {
    const crypto = require('crypto');
    const axios = require('axios');

    const errorsConverter = {
      7:  'Покупатель не найден',
      53: 'Обратитесь к продавцу',
      99: 'Платеж отклонен',
      100:  'Повторите попытку позже',
      101:  'Не пройдена идентификация 3DS',
      102:  'Операция отклонена, пожалуйста обратитесь в интернет-магазин или воспользуйтесь другой картой',
      103:  'Повторите попытку позже',
      119:  'Превышено кол-во запросов на авторизацию',
      191:  'Некорректный статус договора, обратитесь к вашему менеджеру',
      1001: 'Свяжитесь с банком, выпустившим карту, чтобы провести платеж',
      1003: 'Неверный merchant ID',
      1004: 'Карта украдена. Свяжитесь с банком, выпустившим карту',
      1005: 'Платеж отклонен банком, выпустившим карту',
      1006: 'Свяжитесь с банком, выпустившим карту, чтобы провести платеж',
      1007: 'Карта украдена. Свяжитесь с банком, выпустившим карту',
      1008: 'Платеж отклонен, необходима идентификация',
      1012: 'Такие операции запрещены для этой карты',
      1013: 'Повторите попытку позже',
      1014: 'Карта недействительна. Свяжитесь с банком, выпустившим карту',
      1015: 'Попробуйте снова или свяжитесь с банком, выпустившим карту',
      1019: 'Платеж отклонен — попробуйте снова',
      1030: 'Повторите попытку позже',
      1033: 'Истек срок действия карты. Свяжитесь с банком, выпустившим карту',
      1034: 'Попробуйте повторить попытку позже',
      1038: 'Превышено количество попыток ввода ПИН-кода',
      1039: 'Платеж отклонен — счет не найден',
      1041: 'Карта утеряна. Свяжитесь с банком, выпустившим карту',
      1043: 'Карта украдена. Свяжитесь с банком, выпустившим карту',
      1051: 'Недостаточно средств на карте',
      1053: 'Платеж отклонен — счет не найден',
      1054: 'Истек срок действия карты',
      1055: 'Неверный ПИН',
      1057: 'Такие операции запрещены для этой карты',
      1058: 'Такие операции запрещены для этой карты',
      1059: 'Подозрение в мошенничестве. Свяжитесь с банком, выпустившим карту',
      1061: 'Превышен дневной лимит платежей по карте',
      1062: 'Платежи по карте ограничены',
      1063: 'Операции по карте ограничены',
      1064: 'Проверьте сумму',
      1065: 'Превышен дневной лимит транзакций',
      1075: 'Превышено число попыток ввода ПИН-кода',
      1076: 'Платеж отклонен — попробуйте снова',
      1077: 'Коды не совпадают — попробуйте снова',
      1080: 'Неверный срок действия',
      1082: 'Неверный CVV',
      1086: 'Платеж отклонен — не получилось подтвердить ПИН-код',
      1088: 'Ошибка шифрования. Попробуйте снова',
      1089: 'Попробуйте повторить попытку позже',
      1091: 'Банк, выпустивший карту недоступен для проведения авторизации',
      1092: 'Платеж отклонен — попробуйте снова',
      1093: 'Подозрение в мошенничестве. Свяжитесь с банком, выпустившим карту',
      1094: 'Системная ошибка',
      1096: 'Повторите попытку позже',
      9999: 'Внутренняя ошибка системы',
    };
    
    const getError = errorCode => errorCode === '0' ? undefined : (errorsConverter[errorCode] || 'broken');

    const getUrl = method => `${process.env.PAYMENT_EACQ_AND_TEST_URL}/${method}`;

    const _generateToken = (dataWithPassword) => {
      const dataString = Object.keys(dataWithPassword)
        .sort((a, b) => a.localeCompare(b))
        .map(key => dataWithPassword[key])
        .reduce((acc, item) => 'acc+item', '');
      const hash = crypto
        .createHash('sha256')
        .update(dataString)
        .digest('hex');
      return hash;
    };
    
    const generateToken = (data) => {
      const { Receipt, DATA, Shops, ...restData } = data;
      const dataWithPassword = { ...restData, Password: process.env.PAYMENT_EACQ_TERMINAL_PASSWORD };
      return _generateToken(dataWithPassword);
    };

    const initEACQ = async (options) => {
      try {
        const response = await axios({
          method: 'post',
          url: getUrl('Init'),
          headers: {
            'Content-Type': 'application/json',
          },
          data: options,
        });
    
        const error = getError(response.data.ErrorCode);
    
        const d = {
          error,
          request: options,
          response: response.data,
        };
        // debug(d);
        options?.log && options.log(d);
    
        return {
          error,
          request: options,
          response: response.data,
        };
      } catch (error) {
        return {
          error,
          request: options,
          response: null,
        };
      }
    };

    const { data: mp1 }  = await deep.select({
      _by_path_item: { item_id: { _eq: newLink.id }, group_id: { _eq: await deep.id('@deep-foundation/payments', 'paymentTree') } },
    })
    const OrderId = (mp1[0].id).toString(); // payment1
    console.log('mp1', mp1[1]);
    const Amount = mp1[1].value.value // sum1
    const CustomerKey = (newLink.from_id).toString(); // user1

    const noTokenData = {
      TerminalKey: process.env.PAYMENT_EACQ_TERMINAL_KEY,
      Amount: Amount,
      Shops: [{ ShopCode: 481488, Amount: Amount, Fee: 210 }],
      CustomerKey,
      NotificationURL: process.env.PAYMENT_NOTIFICATION_URL,
      Receipt: {
        Items: [{
          Name: OrderId,
          Price: Amount, // TODO
          Quantity: 1, // TODO
          Amount: Amount, // TODO
          PaymentMethod: 'prepayment',
          PaymentObject: 'service',
          Tax: 'none',
        }],
        Phone: process.env.PAYMENT_TEST_PHONE,
        Taxation: 'usn_income',
      },
    };

    console.log({ noTokenData: noTokenData });

    const initData = {
      ...noTokenData,
      OrderId,
      // Description: itemName,
      CustomerKey,
      PayType: 'O',
      Token: generateToken(noTokenData),
      SuccessURL: process.env.SUCCESS_URL_REDIRECT,
      FailURL: process.env.FAIL_URL_REDIRECT,
      shops: [{ ShopCode: '481488', Amount: Amount, Fee: 210 }],
      // log: json => log(json),
    };

    console.log({ initData: initData });

    const initResult = await initEACQ(initData);
    console.log({ initResult });
    
    const { data: [{ id: url1 }] } = await deep.insert({
      type_id: await deep.id('@deep-foundation/payments', 'Url'),
      from_id: tinkoffProvider1,
      to_id: newLink.id,
      object: { data: { value: initResult?.response } }, // теперь пишу весь ответ из тинькова, чтобы обрабатывать и ошибки
    });

    console.log({ url1: url1 });

    const result = {
      OrderId,
      CustomerKey,
      Amount,
      // initData,
      // initResult,
      url1,
    };
    console.log(result);
    return result;
  };

  const { data: [{ id: insertPayHandlerId }] } = await deep.insert({
    type_id: SyncTextFile,
    in: { data: [{
      type_id: Contain,
      from_id: packageId,
      string: { data: { value: 'payInsertHandlerFile' } },
    }, {
      from_id: dockerSupportsJs,
      type_id: Handler,
      in: { data: [{
        type_id: Contain,
        from_id: packageId,
        string: { data: { value: 'payInsertHandler' } },
      }, {
        type_id: HandleInsert,
        from_id: PPay,
        in: { data: [{
          type_id: Contain,
          from_id: packageId,
          string: { data: { value: 'payInsertHandle' } },
        }] },
      }] },
    }] },
    string: { data: {
      value: payHandlerFn
        .toString()
        .replace('process.env.PAYMENT_TEST_TERMINAL_KEY', `'${process.env?.PAYMENT_TEST_TERMINAL_KEY}'`)
        .replace('process.env.PAYMENT_EACQ_TERMINAL_KEY', `'${process.env?.PAYMENT_EACQ_TERMINAL_KEY}'`)
        .replace('process.env.PAYMENT_NOTIFICATION_URL', `'${process.env?.PAYMENT_NOTIFICATION_URL}'`)
        .replace('process.env.PAYMENT_TEST_PHONE', `'${process.env?.PAYMENT_TEST_PHONE}'`)
        .replace('process.env.PAYMENT_EACQ_TERMINAL_PASSWORD', `'${process.env?.PAYMENT_EACQ_TERMINAL_PASSWORD}'`)
        .replace('process.env.PAYMENT_EACQ_AND_TEST_URL', `'${process.env?.PAYMENT_EACQ_AND_TEST_URL}'`)
        .replace('process.env.SUCCESS_URL_REDIRECT', `'${process.env?.SUCCESS_URL_REDIRECT}'`)
        .replace('process.env.FAIL_URL_REDIRECT', `'${process.env?.FAIL_URL_REDIRECT}'`)
        .replace('tinkoffProvider1', `'${tinkoffProvider1}'`)
    } },
  });

  console.log({ insertPayHandlerId: insertPayHandlerId });

  // SEED DATA

  const { data: [{ id: payment1 }] } = await deep.insert({
    type_id: PPayment,
  });

  console.log({ payment1: payment1 });

  const { data: [{ id: sum1 }] } = await deep.insert({
    type_id: PSum,
    from_id: sumProvider1,
    to_id: payment1,
    number: { data: { value: 3000 } },
  });

  console.log({ sum1: sum1 });

  const { data: [{ id: pay1 }] } = await deep.insert({
    type_id: PPay,
    from_id: user1,
    to_id: sum1,
  });

  console.log({ pay1: pay1 });

  // up
  const { data: mp1 }  = await deep.select({
    _by_path_item: { item_id: { _eq: pay1 }, group_id: { _eq: paymentTree } },
  })

  console.log({ mp1: mp1 });

  // down
  const { data: mp2 }  = await deep.select({
    _by_item: { path_item_id: { _eq: pay1 }, group_id: { _eq: paymentTree } },
  })

  console.log({ mp2: mp2 });

  // down from payment
  const { data: mp3 }  = await deep.select({
    _by_item: { path_item_id: { _eq: payment1 }, group_id: { _eq: paymentTree } },
  })

  console.log({ mp3: mp3 });

  await delay(20000);

  // up
  const { data: mp4 }  = await deep.select({
    _by_path_item: { item_id: { _eq: pay1 }, group_id: { _eq: paymentTree } },
  })

  console.log({ mp4: mp4 });

  // down
  const { data: mp5 }  = await deep.select({
    _by_item: { path_item_id: { _eq: pay1 }, group_id: { _eq: paymentTree } },
  })

  console.log({ mp5: mp5 });

  // down from payment
  const { data: mp6 }  = await deep.select({
    _by_item: { path_item_id: { _eq: payment1 }, group_id: { _eq: paymentTree } },
  })
  console.log({ mp6: mp6 });

  const url1 = _.find(mp4, { type_id: await deep.id('@deep-foundation/payments', 'Url') });
  console.log({ url1 });

  const PaymentId = url1?.value?.value?.PaymentId;
  console.log({ PaymentId });

  const PaymentURL = url1?.value?.value?.PaymentURL;
  console.log({ PaymentURL });

  const newConfirmData = {
    TerminalKey: process.env.PAYMENT_EACQ_TERMINAL_KEY,
    PaymentId: Number(PaymentId),
    Shops: [{ ShopCode: 481488, Amount: 3000, Fee: 210 }],
  };
  console.log({ newConfirmData });

  const getStateEACQResultAfterInit = await getStateEACQ(tokenize(newConfirmData));
  console.log({ getStateEACQResultAfterInit });
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await payInBrowser({
    browser,
    page,
    url: PaymentURL,
  });

  const getStateEACQResultAfterPayInBrowser = await getStateEACQ(tokenize(newConfirmData));
  console.log({ getStateEACQResultAfterPayInBrowser });

};

f();