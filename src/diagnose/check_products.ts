import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

async function check() {
  try {
    const colRef = collection(db, 'products');
    const snap = await getDocs(colRef);
    console.log('Total products:', snap.size);
    snap.forEach(d => {
      const data = d.data();
      console.log(d.id, '|', data.name, '| cat:', data.categoryName, '| groups:', data.optionGroups?.length || 0);
    });
  } catch (err) {
    console.error('Error checking products:', err);
  }
}

check();
