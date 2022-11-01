import axios from 'axios';
import { getUrl, getError, objectToFormData } from './_utils';
import Debug from 'debug';

const debug = Debug('payments:tinkoff-a2c:get-state');

export interface IGetStateRequest {
  (options: IGetStateOptions): Promise<IGetStateResponse>;
}

export interface IGetStateOptions {
  TerminalKey: string;
  PaymentId: number;
  IP: string;
  DigestValue?: string;
  SignatureValue?: string;
  X509SerialNumber?: string;
  Token?: string;
  log?: (data) => any;
}

export interface IGetStateResponse {
  error: string;
  request: IGetStateOptions;
  response: IGetStateMethodResponse;
}

export interface IGetStateMethodResponse {
  TerminalKey: string;
  OrderId: string;
  Success: boolean;
  Status: string;
  ErrorCode: string;
  Message?: string;
  Details?: string;
}

export const getState: IGetStateRequest = async (options: IGetStateOptions): Promise<IGetStateResponse> => {
  try {
    const response = await axios({
      method: 'post',
      url: getUrl('GetState'),
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
  } catch (error) {
    return {
      error,
      request: options,
      response: null,
    };
  }
};
