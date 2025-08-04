export type OpenExchangeAPIResponse = {
  disclaimer: string;
  license: string;
  timestamp: number;
  base: string;
  rates: {
    [currencyCode: string]: number;
  };
};

export type OpenExchangeResponse = {
  from: string;
  to: "USD";
  rate: number;
};

/**
 * MERCADOPAGO
 */
export type MercadoPagoPreference = {
  id: string;
  initPoint: string;
};

export type MercadoPagoWebhookPayload = {
  action: string;
  api_version: string;
  data: {
    id: string;
  };
  date_created: string;
  id: number;
  live_mode: boolean;
  type: "payment";
  user_id: number;
};

export type MercadoPagoPaymentDetails = {
  id: number;
  status:
    | "pending"
    | "approved"
    | "authorized"
    | "in_process"
    | "in_mediation"
    | "rejected"
    | "cancelled"
    | "refunded"
    | "charged_back";
  status_detail: string;
  transaction_amount: number;
  currency_id: string;
  description: string;
  external_reference: string;
  net_amount: number;
  metadata: {
    user_data: { organization_id: string; user_id: string };
  };
  fee_details: {
    amount: number;
    fee_payer: string;
    type: string;
  }[];
  transaction_details: {
    net_received_amount: number;
    total_paid_amount: number;
    overpaid_amount: number;
    installment_amount: number;
  };
};
