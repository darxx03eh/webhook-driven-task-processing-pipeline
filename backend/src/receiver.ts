/*
    * This is a simple Express server that listens for incoming webhook requests on the /webhook endpoint.
*/
import express from 'express';

const app = express();
app.use(express.json());

app.post("/webhook", (req, res) => {
    console.log("Received webhook request:");
    console.log(JSON.stringify(req.body, null, 2));
    res.status(200).send({ received: true });
});

app.listen(4000, () => {
    console.log("Receiver running on http://localhost:4000/webhook")
})