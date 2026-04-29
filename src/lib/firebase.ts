import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, getDocs, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app, firebaseConfig.storageBucket);
export const googleProvider = new GoogleAuthProvider();

export async function testConnection() {
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc);
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn("Firestore is operating in offline mode.");
    }
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  UPLOAD = 'upload'
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error(`Firebase Error (${operationType}): `, JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

import { SlotConfig } from '../types';

export async function getSlots(): Promise<SlotConfig[]> {
  const path = 'slots';
  try {
    const querySnapshot = await getDocs(collection(db, path));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SlotConfig));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function updateSlot(slot: SlotConfig) {
  const path = `slots/${slot.id}`;
  try {
    const { id, ...data } = slot; // Extract id so we don't save it as a field if we don't want to, but keep it if we do
    await setDoc(doc(db, 'slots', slot.id), {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToSlots(callback: (slots: SlotConfig[]) => void) {
  const path = 'slots';
  return onSnapshot(collection(db, path), (snapshot) => {
    const slots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SlotConfig));
    callback(slots);
  }, (error) => {
    // Don't throw from async snapshot callbacks. In networks where Google services are blocked,
    // throwing here can break the whole app and prevent local models from loading.
    console.error('Firebase snapshot error:', error);
  });
}

export async function uploadModel(file: File, slotId: string): Promise<string> {
  const fileName = `slot_${slotId}_${Date.now()}.fbx`;
  const storagePath = `models/${fileName}`;
  const fileRef = ref(storage, storagePath);
  
  try {
    console.log(`Starting upload to: ${storagePath} (Bucket: ${storage.app.options.storageBucket})`);
    
    // Check if user is signed in
    if (!auth.currentUser) {
      throw new Error("Authentication required for upload.");
    }

    await uploadBytes(fileRef, file);
    console.log("Upload successful, fetching download URL...");
    return await getDownloadURL(fileRef);
  } catch (error: any) {
    console.error("Storage Error Details:", error);
    // Wrap storage error in our standardized format
    handleFirestoreError(error, OperationType.UPLOAD, storagePath);
    throw error; // handleFirestoreError throws, but just in case
  }
}
