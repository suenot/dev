import axios from 'axios';
import { getUrl, getError, objectToFormData } from './_utils';
import Debug from 'debug';

const debug = Debug('payments:tinkoff-a2c:removeCustomer');

export interface IRemoveCustomerRequest {
  (options: IRemoveCustomerOptions): Promise<IRemoveCustomerResponse>;
}

export interface IRemoveCustomerOptions {
  TerminalKey: string;
  CustomerKey: string;
  IP?: string;
  DigestValue?: string;
  SignatureValue?: string;
  X509SerialNumber?: string;
  Token?: string;
  log?: (data) => any;
}

export interface IRemoveCustomerResponse {
  error: string;
  request: IRemoveCustomerOptions;
  response: IRemoveCustomerMethodResponse;
}

export interface IRemoveCustomerMethodResponse {
  TerminalKey: string;
  CustomerKey: string;
  Success: string;
  ErrorCode: string;
  Message?: string;
  Details?: string;
}

export const removeCustomer: IRemoveCustomerRequest = async (options: IRemoveCustomerOptions): Promise<IRemoveCustomerResponse> => {
  try {
    const response = await axios({
      method: 'post',
      url: getUrl('RemoveCustomer'),
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
