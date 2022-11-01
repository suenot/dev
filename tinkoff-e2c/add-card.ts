import axios from 'axios';
import { getUrl, getError, objectToFormData } from './_utils';
import Debug from 'debug';

const debug = Debug('payments:tinkoff-a2c:addCard');

export interface IAddCardRequest {
  (options: IAddCardOptions): Promise<IAddCardResponse>;
}

export interface IAddCardOptions {
  TerminalKey: string;
  CustomerKey: string;
  CheckType?: 'NO' | 'HOLD' | '3DS' | '3DSHOLD';
  Description?: string;
  PayForm?: string;
  IP?: string;
  DigestValue?: string;
  SignatureValue?: string;
  X509SerialNumber?: string;
  Token?: string;
  log?: (data) => any;
}

export interface IAddCardResponse {
  error: string;
  request: IAddCardOptions;
  response: IAddCardMethodResponse;
}

export interface IAddCardMethodResponse {
  TerminalKey: string;
  CustomerKey: string;
  RequestKey: string;
  PaymentId?: number;
  PaymentURL: string;
  Success: string;
  ErrorCode: string;
  Message?: string;
  Details?: string;
}

export const addCard: IAddCardRequest = async (options: IAddCardOptions): Promise<IAddCardResponse> => {
  try {
    const response = await axios({
      method: 'post',
      url: getUrl('AddCard'),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: objectToFormData(options),
    });

    const error = getError(response.data.ErrorCode);

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
