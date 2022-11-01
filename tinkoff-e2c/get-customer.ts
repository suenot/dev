import axios from 'axios';
import { getUrl, getError, objectToFormData } from './_utils';
import Debug from 'debug';

const debug = Debug('payments:tinkoff-a2c:getCustomer');

export interface IGetCustomerRequest {
  (options: IGetCustomerOptions): Promise<IGetCustomerResponse>;
}

export interface IGetCustomerOptions {
  TerminalKey: string;
  CustomerKey: string;
  IP?: string;
  DigestValue?: string;
  SignatureValue?: string;
  X509SerialNumber?: string;
  Token?: string;
  log?: (data) => any;
}

export interface IGetCustomerResponse {
  error: string;
  request: IGetCustomerOptions;
  response: IGetCustomerMethodResponse;
}

export interface IGetCustomerMethodResponse {
  TerminalKey: string;
  CustomerKey: string;
  Success: string;
  ErrorCode: string;
  Email?: string;
  Phone?: string;
  Message?: string;
  Details?: string;
}

export const getCustomer: IGetCustomerRequest = async (options: IGetCustomerOptions): Promise<IGetCustomerResponse> => {
  try {
    const response = await axios({
      method: 'post',
      url: getUrl('GetCustomer'),
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
