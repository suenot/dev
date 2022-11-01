import axios from 'axios';
import { getUrl, getError, objectToFormData } from './_utils';
import Debug from 'debug';

const debug = Debug('payments:tinkoff-a2c:getCardList');

export interface IGetCardListRequest {
  (options: IGetCardListOptions): Promise<IGetCardListResponse>;
}

export interface IGetCardListOptions {
  TerminalKey: string;
  CustomerKey: string;
  IP?: string;
  DigestValue?: string;
  SignatureValue?: string;
  X509SerialNumber?: string;
  Token?: string;
  log?: (data) => any;
}

export interface IGetCardListResponse {
  error: string;
  request: IGetCardListOptions;
  response: IGetCardListMethodResponse[];
}

export interface IGetCardListMethodResponse {
  Pan: string;
  CardId: string;
  Status: string;
  RebillId: number;
  CardType: '0' | '1' | '2';
  ExpDate?: string;
}

export const getCardList: IGetCardListRequest = async (options: IGetCardListOptions): Promise<IGetCardListResponse> => {
  try {
    const response = await axios({
      method: 'post',
      url: getUrl('GetCardList'),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: objectToFormData(options),
    });

    const error = getError('0');
    console.log('error', error);
    const d = {
      error,
      request: options,
      response: response.data,
    };
    debug(d);
    options?.log && options.log(d);

    return {
      error,
      request: options,
      response: response.data,
    };
  } catch (e) {
    console.log(e?.response?.data);
    console.log(e?.response?.status);
    console.log(e?.response?.data?.Causes);
    const error = getError(e?.response?.ErrorCode);
    return {
      error,
      request: options,
      response: null,
    };
  }
};
