import axios from 'axios';
import { getUrl, getError, objectToFormData } from './_utils';
import Debug from 'debug';

const debug = Debug('payments:tinkoff-a2c:payment');

export interface IPaymentRequest {
  (options: IPaymentOptions): Promise<IPaymentResponse>;
}

export interface IPaymentOptions {
  TerminalKey: string;
  PaymentId: number;
  DigestValue?: string;
  SignatureValue?: string;
  X509SerialNumber?: string;
  Token?: string;
  log?: (data) => any;
}

export interface IPaymentResponse {
  error: string;
  request: IPaymentOptions;
  response: IPaymentMethodResponse;
}

export interface IPaymentMethodResponse {
  TerminalKey: string;
  OrderId: string;
  Success: boolean;
  Amount: number;
  Status: string;
  PaymentId: number;
  ErrorCode: string;
  Message?: string;
  Details?: string;
}

export const payment: IPaymentRequest = async (options: IPaymentOptions): Promise<IPaymentResponse> => {
  try {
    const response = await axios({
      method: 'post',
      url: getUrl('Payment'),
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
