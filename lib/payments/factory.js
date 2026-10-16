"use strict";

const { PaystackAdapter } = require("./paystack-adapter");
const { FlutterwaveAdapter } = require("./flutterwave-adapter");

function createPaymentProvider(name = process.env.LAGOSGO_PAYMENT_PROVIDER) {
  if (name === "paystack") return new PaystackAdapter();
  if (name === "flutterwave") return new FlutterwaveAdapter();
  throw new Error("payment_provider_not_configured_or_unsupported");
}

module.exports = { createPaymentProvider };
