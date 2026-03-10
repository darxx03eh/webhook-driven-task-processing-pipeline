/*
    * This file is used to generate the signature for the webhook request. 
    * It is not used in the actual application. It is only used for testing purposes.
*/
import crypto from "crypto";
const secret = "907a83b1dbb679ed2f5551e03a6f3ed6c45ab886e2226ed19d113e4ecd004719";
const rawBody = '{"product":"pizza","price":75,"ip":"8.8.8.8","first_name":"Mahmoud","last_name":"Darawsheh"}';
const signature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
console.log("signature =", signature);
console.log("body =", rawBody);