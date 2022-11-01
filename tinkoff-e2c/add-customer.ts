import axios from 'axios';
import { getUrl, getError, objectToFormData } from './_utils';
import Debug from 'debug';

const debug = Debug('payments:tinkoff-a2c:addCustomer');

export interface IAddCustomerRequest {
  (options: IAddCustomerOptions): Promise<IAddCustomerResponse>;
}

export interface IAddCustomerOptions {
  TerminalKey: string;
  CustomerKey: string;
  IP?: string;
  Email?: string;
  Phone?: string;
  DigestValue?: string;
  SignatureValue?: string;
  X509SerialNumber?: string;
  Token?: string;
  log?: (data) => any;
}

export interface IAddCustomerResponse {
  error: string;
  request: IAddCustomerOptions;
  response: IAddCustomerMethodResponse;
}

export interface IAddCustomerMethodResponse {
  TerminalKey: string;
  CustomerKey: string;
  Success: string;
  ErrorCode: string;
  Message?: string;
  Details?: string;
}

export const addCustomer: IAddCustomerRequest = async (options: IAddCustomerOptions): Promise<IAddCustomerResponse> => {
  try {
    const response = await axios({
      method: 'post',
      url: getUrl('AddCustomer'),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: objectToFormData(options),
    });
    debug('ErrorCode', response?.data?.ErrorCode);
    debug('message', response.data.Message);
    debug(response.data.Causes);
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
