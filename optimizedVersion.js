const cronJob = require("node-cron");
const moment = require("moment-timezone");

const usersChat = require("../models/usersChatSchema");
const userSchema = require("../models/userSchema");

const getThiryDaysBeforeNow = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return thirtyDaysAgo;
};

const findIdsAndUpdateChatSchema = async (ids, isGhostUser) => {
    return await userSchema.updateMany(
        { _id: { $in: ids } },
        { $set: { isGhostUser: isGhostUser } }
    );
}

const findGhostUsersAndUpdate = async (comparisonOperator, isGhostUser) => {

    let time = null;

    //for ghost
    if (comparisonOperator === "$lte") {
        time = {
            [comparisonOperator]: getThiryDaysBeforeNow(), //before or equal 30 days from now
        }
    }

    //for un ghost
    if (comparisonOperator === "$gte") {
        time = {
            [comparisonOperator]: getThiryDaysBeforeNow(), //after or equal 30 days from now
            $lte: new Date(),
        }
    }

    console.log(time);

    const ghostUsers = await usersChat
        .aggregate([
            {
                $group: {
                    _id: "$userId",
                    time: {
                        $last: "$time", //get latest time
                    },
                },
            },
            {
                $sort: {
                    time: 1,
                },
            },
            {
                $match: {
                    time: time
                },
            },
        ])
        .then((res) => res.map((v) => v._id));


    const makeGhostUsers = await findIdsAndUpdateChatSchema(ghostUsers, isGhostUser)


    if (comparisonOperator === "$lte") {
        console.log("GHOST USERS", makeGhostUsers);
        console.log("GHOST USERS IDS", ghostUsers);
    }


    if (comparisonOperator === "$gte") {
        console.log("UN GHOST USERS", makeGhostUsers);
        console.log("UN GHOST USERS IDS", ghostUsers);
    }

    return ghostUsers;
};

const GhostCronJob = async () => {
    let job = cronJob.schedule(
        "*/5 * * * *", //every five minutes
        // "*/1 * * * *", //every five minutes
        // "* * * * * *", //local dev testing pattern
        async () => {
            moment.suppressDeprecationWarnings = true; // for removing warnings of moments

            await findGhostUsersAndUpdate("$lte", true); //for making ghost users
            await findGhostUsersAndUpdate("$gte", false); //for making unghost users
        },
        {
            scheduled: false,
            timezone: "Asia/Singapore",
        }
    );

    job.start();
};

module.exports = {
    GhostCronJob,
};
