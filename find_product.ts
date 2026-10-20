import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './src/lib/firebase';

async function findProduct() {
  const q = query(collection(db, 'products'), where('name', '==', 'Açaí 500 ml'));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    console.log("Product ID:", doc.id);
    console.log("Data:", doc.data());
  });
}
findProduct().catch(console.error);
