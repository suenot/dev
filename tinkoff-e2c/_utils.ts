import crypto from 'crypto';
import base64 from 'base-64';
import promptSync from 'prompt-sync';

const prompt = promptSync({ sigint: true });

export const getUrl = method => `${process.env.PAYMENT_BS_E2C_URL}/${method}`;
const privateKey = process.env.PAYMENT_E2C_PRIVATE;

const sleep = (ms: any) => new Promise(resolve => setTimeout(resolve, ms));

export const objectToFormData = (details) => {
  const formBody = [];
  for (const property in details) {
    const encodedKey = encodeURIComponent(property);
    const encodedValue = encodeURIComponent(details[property]);
    formBody.push(`${encodedKey}=${encodedValue}`);
  }
  return formBody.join('&');
};

export const errorsConverter = {
  99:	'Воспользуйтесь другой картой, банк, выпустивший карту, отклонил операцию',
  101:	'Не пройдена идентификация 3DS',
  191:	'Некорректный статус договора, обратитесь к вашему менеджеру',
  604:	'Не получилось совершить платеж. Свяжитесь с поддержкой',
  619:	'Отсутствуют обязательные данные отправителя',
  620:	'Проверьте сумму — она не может быть равна 0.',
  623:	'Выплата по этому заказу уже прошла',
  632:	'Превышен лимит на сумму операции',
  633:	'Превышен лимит на количество переводов в день по иностранным картам',
  634:	'Превышен лимит на сумму переводов по номеру карты в месяц',
  637:	'Не хватает данных получателя или отправителя для выплаты наиностранную карту. Проверьте заполнение',
  642:	'Проверьте номер карты',
  648:	'Не получилось пополнить карту. Свяжитесь с поддержкой',
  650:	'Не получилось пополнить карту. Попробуйте позже',
  651:	'Не получилось совершить платеж. Свяжитесь с поддержкой',
  703:	'Не получилось пополнить карту. Попробуйте позже',
  1006:	'Проверьте реквизиты или воспользуйтесь другой картой',
  1012:	'Воспользуйтесь другой картой',
  1013:	'Повторите попытку позже',
  1014:	'Неверно введены реквизиты карты. Проверьте корректность введенных данных',
  1030:	'Повторите попытку позже',
  1033:	'Проверьте реквизиты или воспользуйтесь другой картой',
  1034:	'Воспользуйтесь другой картой, банк, выпустивший карту, отклонил операцию',
  1041:	'Воспользуйтесь другой картой, банк, выпустивший карту, отклонил операцию',
  1043:	'Воспользуйтесь другой картой, банк, выпустивший карту, отклонил операцию',
  1051:	'Недостаточно средств на карте',
  1054:	'Проверьте реквизиты или воспользуйтесь другой картой',
  1057:	'Воспользуйтесь другой картой, банк, выпустивший карту, отклонил операцию',
  1065:	'Воспользуйтесь другой картой, банк, выпустивший карту, отклонил операцию',
  1082:	'Проверьте реквизиты или воспользуйтесь другой картой',
  1089:	'Воспользуйтесь другой картой, банк, выпустивший карту, отклонил операцию',
  1091:	'Воспользуйтесь другой картой',
  1096:	'Повторите попытку позже',
  1502:	'Недостаточно средств на счете компании',
  1503:	'Некорректный статус счета, обратитесь в поддержку',
  9999:	'Внутренняя ошибка системы',
};

export const getError = errorCode => errorCode === '0' ? undefined : (errorsConverter[errorCode] || 'broken');

const _generateToken = (dataWithPassword) => {
  const dataString = Object.keys(dataWithPassword)
    .sort((a, b) => a.localeCompare(b))
    .map(key => dataWithPassword[key])
    .reduce((acc, item) => `${acc}${item}`, '');
  const hash = crypto
    .createHash('sha256')
    .update(dataString)
    .digest('hex');
  return hash;
};

export const generateToken = (data) => {
  const { Receipt, DATA, ...restData } = data;
  const dataWithPassword = { ...restData, Password: process.env.PAYMENT_BS_TERMINAL_PASSWORD };
  return _generateToken(dataWithPassword);
};

export const tokenize = (options) => {
  return {
    ...options,
    Token: generateToken(options),
  };
};

export const generateSignature = (data) => {
  const { DigestValue, SignatureValue, X509SerialNumber, ...keys } = data;

  console.log('keys', keys);
  const dataString = Object.keys(keys)
    .sort((a, b) => a.localeCompare(b))
    .map(key => keys[key])
    .reduce((acc, item) => `${acc}${item}`, '');
  console.log('dataString', dataString);
  const binaryHash = crypto
    .createHash('sha256')
    .update(dataString)
    .digest('latin1');
  console.log('binaryHash', binaryHash);
  console.log('typeof binaryHash', typeof(binaryHash));
  const generatedDigestValue = base64.encode(binaryHash);
  console.log('generatedDigestValue', generatedDigestValue);
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(generatedDigestValue);
  const generatedSignatureValue = signer.sign(privateKey, 'base64');
  // const generatedSignatureValue = signer.sign(privateKey).toString('base64');
  console.log('generatedSignatureValue', generatedSignatureValue);
  // const based64generatedSignatureValue = base64.encode(generatedSignatureValue);
  // console.log("based64generatedSignatureValue", based64generatedSignatureValue);
  return { DigestValue: generatedDigestValue, SignatureValue: generatedSignatureValue };
};

export interface IReceipt {
  Items: IItem[];
  Phone?: string;
  Email?: string;
  Taxation: string;
}

export interface IItem {
  Name: string;
  Price: number;
  Quantity: number;
  Amount: number;
  PaymentMethod?: string;
  PaymentObject?: string;
  Tax: string;
}
export interface IShops {
  ShopCode: String;
  Amount: number;
  Name?: string;
  Fee?: number;
}

// Добавление карты, на которую потом нужно делать выплату
export const addCardInBrowser = async ({ page, browser, url }) => {
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.waitFor('#card-number__input');
  await sleep(300);
  await page.type('#card-number__input', process.env.PAYMENT_E2C_CARD_NUMBER_SUCCESS); // card number
  await sleep(300);
  await page.keyboard.press('Tab');
  await sleep(300);
  await page.type('#card-expiration__input', process.env.PAYMENT_E2C_CARD_EXPDATE); // expired date
  await sleep(300);
  await page.keyboard.press('Tab');
  await sleep(300);
  const needToEnterCVC = await page.evaluate(() => {
    return !!document.querySelector('#cvv__input1');
  });
  if (needToEnterCVC) {
    console.log('NEED CVC!!!!!!!');
    await page.type('#cvv__input1', process.env.PAYMENT_E2C_CARD_CVC[0]); // CVC code
    await sleep(300);
    await page.keyboard.press('Tab');
    await sleep(300);
    await page.type('#cvv__input2', process.env.PAYMENT_E2C_CARD_CVC[1]); // CVC code
    await sleep(300);
    await page.keyboard.press('Tab');
    await sleep(300);
    await page.type('#cvv__input3', process.env.PAYMENT_E2C_CARD_CVC[2]); // CVC code
    await sleep(3000);
  } else {
    console.log('NO NEED CVC!!!!!!!');
  }
  await sleep(1000);
  await page.keyboard.press('Tab');
  await sleep(2000);
  await page.click('.form-submit button'); // submit button
  await sleep(3000);
  // await sleep(100);
  // await page.close();
  // await sleep(100);
  await browser.close();
};

export const payInBrowser = async ({ page, browser, url }) => {
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
