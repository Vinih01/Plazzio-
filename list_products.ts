import { collection, getDocs } from 'firebase/firestore';
import { db } from './src/lib/firebase';

async function listProducts() {
  try {
    const colRef = collection(db, 'products');
    const snapshot = await getDocs(colRef);
    console.log("Products found:", snapshot.size);
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.name === 'Açaí 500 ml') {
        console.log("Found Açaí 500 ml:", doc.id, JSON.stringify(data));
      }
    });
  } catch (e) {
    console.error(e);
  }
}
listProducts().catch(console.error);
