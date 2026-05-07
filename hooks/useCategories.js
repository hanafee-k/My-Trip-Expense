import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, onSnapshot, doc, writeBatch, serverTimestamp, updateDoc, setDoc } from "firebase/firestore";
import { defaultCategories } from "../lib/defaultCategories";
import { useAuth } from "../context/AuthContext";

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCategories(defaultCategories);
      setLoading(false);
      return;
    }

    const q = query(collection(db, `users/${user.uid}/categories`));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Seed default categories
        try {
          const batch = writeBatch(db);
          const timestamp = serverTimestamp();
          
          defaultCategories.forEach((cat, index) => {
            const catRef = doc(collection(db, `users/${user.uid}/categories`), cat.id);
            batch.set(catRef, {
              ...cat,
              order: index,
              createdAt: timestamp,
              updatedAt: timestamp
            });
          });
          
          await batch.commit();
          // The snapshot listener will trigger again once seeded
        } catch (error) {
          console.error("Error seeding default categories:", error);
          setCategories(defaultCategories);
          setLoading(false);
        }
      } else {
        const fetchedCategories = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a, b) => (a.order || 0) - (b.order || 0));
        
        setCategories(fetchedCategories);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const addCategory = async (categoryData) => {
    if (!user) throw new Error("User not authenticated");
    
    // Auto-generate an ID if none provided
    const newId = categoryData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();
    
    const catRef = doc(collection(db, `users/${user.uid}/categories`), newId);
    
    await setDoc(catRef, {
      ...categoryData,
      order: categories.length,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return newId;
  };

  const updateCategory = async (categoryId, updates) => {
    if (!user) throw new Error("User not authenticated");
    
    const catRef = doc(db, `users/${user.uid}/categories`, categoryId);
    await updateDoc(catRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  };

  // Note: Category deletion is deliberately omitted to prevent broken references in transactions.

  return {
    categories,
    loading,
    addCategory,
    updateCategory
  };
}
