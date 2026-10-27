import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://chandanapu25bcs10263_db_user:FxH6LZ3wE1EKLeY6@cluster0.hgrktqs.mongodb.net/chasepay?retryWrites=true&w=majority';

const client = await MongoClient.connect(uri);
const db = client.db('chasepay');
const invoice = await db.collection('invoices').findOne({ status: { $ne: 'paid' } });
console.log('Found invoice publicId:', invoice?.publicId, 'total:', invoice?.total, 'status:', invoice?.status);
await client.close();

const res = await fetch('http://localhost:5000/api/public/invoices/' + invoice.publicId + '/create-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
const order = await res.json();
console.log('ORDER RESULT:', JSON.stringify(order, null, 2));
