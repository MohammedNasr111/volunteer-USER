const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// This function triggers when a new cause is created in Firestore
exports.notifyUsersOfNewCause = functions.firestore
    .document("causes/{causeId}")
    .onCreate(async (snapshot, context) => {
        try {
            const causeData = snapshot.data();
            const {title, description, frequency, categories} = causeData;
            
            // Query for users who match this cause's frequency and categories
            const usersSnapshot = await admin.firestore().collection("users").get();
            
            const tokens = [];
            
            // For each user, check if they should be notified
            usersSnapshot.forEach((userDoc) => {
                const userData = userDoc.data();
                
                // Check if user has a frequency preference that matches this cause
                if (userData.frequency_preference === frequency) {
                    
                    // Check if user has selected any of the categories for this cause
                    const hasMatchingCategory = userData.cause_preferences && 
                        userData.cause_preferences.some((preference) => 
                            categories.includes(preference)
                        );
                    
                    // If user has a matching category and has a notification token
                    if (hasMatchingCategory && userData.notificationToken) {
                        tokens.push(userData.notificationToken);
                    }
                }
            });
            
            // If there are users to notify, send the notification
            if (tokens.length > 0) {
                const message = {
                    notification: {
                        title: `New Volunteer Opportunity: ${title}`,
                        body: description.substring(0, 100) + 
                            (description.length > 100 ? "..." : ""),
                    },
                    data: {
                        causeId: context.params.causeId,
                        click_action: "FLUTTER_NOTIFICATION_CLICK",
                    },
                    tokens: tokens,
                };
                
                // Send the notification
                const response = await admin.messaging().sendMulticast(message);
                console.log(`${response.successCount} messages were sent successfully`);
            }
            
            return null;
        } catch (error) {
            console.error("Error sending notifications:", error);
            return null;
        }
    });