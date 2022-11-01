import axios from 'axios';
import { getUrl, getError, objectToFormData } from './_utils';
import Debug from 'debug';

const debug = Debug('payments:tinkoff-a2c:removeCard');

export interface IRemoveCardRequest {
  (options: IRemoveCardOptions): Promise<IRemoveCardResponse>;
}

export interface IRemoveCardOptions {
  TerminalKey: string;
  CardId: number;
  CustomerKey: string;
  IP?: string;
  DigestValue?: string;
  SignatureValue?: string;
  X509SerialNumber?: string;
  Token?: string;
  log?: (data) => any;
}

export interface IRemoveCardResponse {
  error: string;
  request: IRemoveCardOptions;
  response: IRemoveCardMethodResponse;
}

export interface IRemoveCardMethodResponse {
  TerminalKey: string;
  CardId: number;
  CustomerKey: string;
  Status: string;
  Success: string;
  ErrorCode: string;
  Message?: string;
  Details?: string;
}

export const removeCard: IRemoveCardRequest = async (options: IRemoveCardOptions): Promise<IRemoveCardResponse> => {
  try {
    const response = await axios({
      method: 'post',
      url: getUrl('RemoveCard'),
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
