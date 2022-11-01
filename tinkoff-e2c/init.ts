import axios from 'axios';
import { getUrl, getError, objectToFormData } from './_utils';
import Debug from 'debug';

const debug = Debug('payments:tinkoff-a2c:init');

export interface IInitRequest {
  (options: IInitOptions): Promise<IInitResponse>;
}

export interface IInitOptions {
  TerminalKey: string;
  OrderId: string;
  IP?: string;
  CardId: string;
  Amount: number;
  Currency?: number;
  CustomerKey?: string;
  DATA: IUserData;
  DigestValue?: string;
  SignatureValue?: string;
  X509SerialNumber?: string;
  Token?: string;
  log?: (data) => any;
}

export interface IUserData {
  t_domestic: number;
  Phone?: string;
  Email?: string;
  s_lastname?: string;
  s_firstname?: string;
  s_middlename?: string;
  s_dateOfBirth?: string;
  s_phone?: string;
  s_citizenship?: string;
  s_placeOfBirth?: string;
  s_passportSeries?: string;
  s_pasportNumber?: string;
  s_passportIssueDate?: string;
  s_passportIssuedBy?: string;
  s_resident?: string;
  s_address?: string;
  s_addressZip?: string;
  s_addressCountry?: string;
  s_addressRegion?: string;
  s_addressCity?: string;
  s_addressStreet?: string;
  s_addressBuilding?: string;
  s_addressApartment?: string;
  s_accountNumber?: string;
}

export interface IInitResponse {
  error: string;
  request: IInitOptions;
  response: IInitPaymentResponse;
}

export interface IInitPaymentResponse {
  TerminalKey: string;
  Amount: number;
  OrderId: string;
  Success: boolean;
  Status: string;
  PaymentId: number;
  PaymentURL?: string;
  ErrorCode: string;
  Message?: string;
  Details?: string;
}

export const init: IInitRequest = async (options: IInitOptions): Promise<IInitResponse> => {
  try {
    const response = await axios({
      method: 'post',
      url: getUrl('Init'),
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
