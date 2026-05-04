import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';
import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-anime-reviews',
    firestore: {
      rules: readFileSync(resolve(__dirname, 'DRAFT_firestore.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Anime Reviews Security Rules', () => {
  const animeId = 'some-anime-123';
  const reviewId = 'review-xyz';
  
  const getReviewDoc = (env: any, aId: string, rId: string) => 
    env.firestore().collection('anime').doc(aId).collection('reviews').doc(rId);

  const validReview = (authId: string) => ({
    animeId,
    userId: authId,
    username: 'Test User',
    userPhoto: 'http://example.com/photo.png',
    rating: 5,
    text: 'Great anime!',
    createdAt: (testEnv as any).firestore.FieldValue.serverTimestamp(),
    updatedAt: (testEnv as any).firestore.FieldValue.serverTimestamp()
  });

  it('1. should allow authenticated user to create a valid review', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await assertSucceeds(getReviewDoc(alice, animeId, reviewId).set(validReview('alice')));
  });

  it('2. should deny unauthenticated user from creating a review', async () => {
    const unauth = testEnv.unauthenticatedContext();
    await assertFails(getReviewDoc(unauth, animeId, reviewId).set(validReview('anon')));
  });

  it('3. should deny creating a review with missing required fields', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const invalidReview = validReview('alice');
    delete (invalidReview as any).rating;
    await assertFails(getReviewDoc(alice, animeId, reviewId).set(invalidReview));
  });

  it('4. should deny creating a review with extra fields', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const invalidReview = { ...validReview('alice'), extraField: true };
    await assertFails(getReviewDoc(alice, animeId, reviewId).set(invalidReview));
  });

  it('5. should deny spoofing userId', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const spoofedReview = validReview('bob'); // submitting as 'bob' while authenticated as 'alice'
    await assertFails(getReviewDoc(alice, animeId, reviewId).set(spoofedReview));
  });

  it('6. should deny invalid rating type', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const invalidReview = { ...validReview('alice'), rating: '5' };
    await assertFails(getReviewDoc(alice, animeId, reviewId).set(invalidReview));
  });

  it('7. should deny rating out of bounds', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const invalidReview = { ...validReview('alice'), rating: 6 };
    await assertFails(getReviewDoc(alice, animeId, reviewId).set(invalidReview));
  });

  it('8. should allow a user to update their own review', async () => {
    const alice = testEnv.authenticatedContext('alice');
    // Setup - wait, we can just bypass set security if we use testEnv.withSecurityRulesDisabled, but 
    // it's easier to just assume step 1 works.
    await getReviewDoc(alice, animeId, reviewId).set(validReview('alice'));
    
    // Update
    await assertSucceeds(getReviewDoc(alice, animeId, reviewId).update({
      rating: 4,
      text: 'Actually, it was just okay.',
      updatedAt: (testEnv as any).firestore.FieldValue.serverTimestamp()
    }));
  });

  it('9. should deny updating arbitrary fields (like createdAt or userId)', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await getReviewDoc(alice, animeId, reviewId).set(validReview('alice'));
    
    await assertFails(getReviewDoc(alice, animeId, reviewId).update({
      userId: 'bob',
      updatedAt: (testEnv as any).firestore.FieldValue.serverTimestamp()
    }));
  });

  it('10. should deny users from updating someone else\'s review', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await getReviewDoc(alice, animeId, reviewId).set(validReview('alice'));
    
    const bob = testEnv.authenticatedContext('bob');
    await assertFails(getReviewDoc(bob, animeId, reviewId).update({
      text: 'Bob here, hacking Alice\'s review',
      updatedAt: (testEnv as any).firestore.FieldValue.serverTimestamp()
    }));
  });

  it('11. should enforce size limits on text', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const invalidReview = { ...validReview('alice'), text: 'a'.repeat(2001) };
    await assertFails(getReviewDoc(alice, animeId, reviewId).set(invalidReview));
  });

  it('12. should allow anyone to read a review', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await getReviewDoc(alice, animeId, reviewId).set(validReview('alice'));

    const unauth = testEnv.unauthenticatedContext();
    await assertSucceeds(getReviewDoc(unauth, animeId, reviewId).get());
  });

  it('13. should allow list queries filtered by animeId', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await getReviewDoc(alice, animeId, reviewId).set(validReview('alice'));

    const unauth = testEnv.unauthenticatedContext();
    await assertSucceeds(unauth.firestore().collection('anime').doc(animeId).collection('reviews').where('animeId', '==', animeId).get());
  });
  
  it('14. should deny list queries not filtered by animeId', async () => {
    const unauth = testEnv.unauthenticatedContext();
    // This query is on the subcollection, but it doesn't filter by animeId (even if it's implicitly part of the path, we required it in rules)
    await assertFails(unauth.firestore().collection('anime').doc(animeId).collection('reviews').get());
  });
});
