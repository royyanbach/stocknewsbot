import * as functions from '@google-cloud/functions-framework';

functions.http('getAllStockNews', (req, res) => {
 res.send(`Hello ${req.query.name || req.body.name || 'World'}!`);
});
