const cronJob = require("node-cron");
const moment = require("moment-timezone");

const usersChat = require("../models/usersChatSchema");
const userSchema = require("../models/userSchema");

const findGhostUsersAndUpdateAsGhost = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ghostUsers = await usersChat.aggregate([
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
                time: {
                    $lte: thirtyDaysAgo, //30 days from now
                },
            },
        },
    ]).then((res) => res.map(v => v._id));

    const makeGhostUsers = await userSchema.updateMany(
        { _id: { $in: ghostUsers } },
        { $set: { isGhostUser: true } }
    );

    console.log("GHOST USERS", makeGhostUsers);

    return ghostUsers;
};

//any of ghost user will be active after 30 days on chat then it will be consider as a un ghost
const findGhostUserAndUpdateAsUnGhost = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const unGhostUsers = await usersChat.aggregate([
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
                time: {
                    $gte: thirtyDaysAgo, //after 30 days from now
                    $lte: new Date()
                },
            },
        },
    ])
        .then((res) => res.map(v => v._id));

    const makeUnghostUsers = await userSchema.updateMany(
        { _id: { $in: unGhostUsers } },
        { $set: { isGhostUser: false } }
    );

    console.log("UN GHOST USERS", makeUnghostUsers);

    return unGhostUsers;
};

//every day at 12:00 am  (0 0 * * *)
const GhostCronJob = async () => {
    let job = cronJob.schedule(
        "0 0 * * * *",
        async () => {
            moment.suppressDeprecationWarnings = true; // for removing warnings of moments
            // console.log(await findGhostUsersAndUpdateAsGhost());
            // console.log(await findGhostUserAndUpdateAsUnGhost());
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
