import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK (only once)
admin.initializeApp();

const db = admin.firestore();

/**
 * Cloud Function triggered when a new document is created in the 'causes' collection.
 * It finds users whose preferences match the new cause and creates a notification for them.
 */
exports.notifyUsersOnNewCause = functions.firestore
  .document("causes/{causeId}")
  .onCreate(async (snapshot, context) => {
    const causeData = snapshot.data();
    const causeId = context.params.causeId;

    if (!causeData) {
      console.log("No data associated with the event");
      return null;
    }

    console.log(`New cause created: ${causeId}`, causeData);

    const causeType = causeData.type;
    const causeTitle = causeData.title;

    if (!causeType || !causeTitle) {
      console.error("Cause data is missing required fields (type or title).");
      return null;
    }

    try {
      const usersRef = db.collection("users");
      const matchingUsersQuery = usersRef.where(
        "cause_preferences",
        "array-contains",
        causeType.toLowerCase()
      );

      const matchingUsersSnapshot = await matchingUsersQuery.get();

      if (matchingUsersSnapshot.empty) {
        console.log(
          `No users found with preferences matching cause type: ${causeType}`
        );
        return null;
      }

      console.log(
        `Found ${matchingUsersSnapshot.size} users matching the cause.`
      );

      const notificationsBatch = db.batch();

      matchingUsersSnapshot.forEach((userDoc: admin.firestore.QueryDocumentSnapshot) => {
        const userId = userDoc.id;

        const notificationRef = db.collection("notifications").doc();

        const notificationData = {
          userId: userId,
          type: "new_cause",
          title: "New Cause Matching Your Interests!",
          message: `A new cause "${causeTitle}" matching your preference for "${causeType}" has been added.`,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
          causeId: causeId,
          causeType: causeType,
        };

        notificationsBatch.set(notificationRef, notificationData);
        console.log(`Prepared notification for user: ${userId}`);
      });

      await notificationsBatch.commit();
      console.log("Successfully created notifications for matching users.");

      return null;
    } catch (error) {
      console.error("Error processing new cause notification:", error);
      return null;
    }
  });
