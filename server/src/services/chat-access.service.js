const userModel = require('../models/user.model');

function areParticipantsEligible(users, participantIds) {
    const usersById = new Map(users.map((user) => [String(user._id), user]));
    if (participantIds.some((id) => !usersById.has(String(id)))) return false;

    for (let firstIndex = 0; firstIndex < participantIds.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < participantIds.length; secondIndex += 1) {
            const firstId = String(participantIds[firstIndex]);
            const secondId = String(participantIds[secondIndex]);
            const first = usersById.get(firstId);
            const second = usersById.get(secondId);
            const firstFollowsSecond = (first.following ?? []).some(
                (id) => String(id) === secondId
            );
            const secondFollowsFirst = (second.following ?? []).some(
                (id) => String(id) === firstId
            );
            const firstBlocksSecond = (first.blockedUsers ?? []).some(
                (id) => String(id) === secondId
            );
            const secondBlocksFirst = (second.blockedUsers ?? []).some(
                (id) => String(id) === firstId
            );

            if (
                !firstFollowsSecond
                || !secondFollowsFirst
                || firstBlocksSecond
                || secondBlocksFirst
            ) {
                return false;
            }
        }
    }

    return participantIds.length > 1;
}

async function areParticipantsEligibleById(participantIds) {
    const uniqueIds = [...new Set(participantIds.map(String))];
    const users = await userModel.find({ _id: { $in: uniqueIds } })
        .select('following blockedUsers')
        .lean();
    return areParticipantsEligible(users, uniqueIds);
}

async function filterEligibleConversations(conversations) {
    const participantIds = [...new Set(conversations.flatMap((conversation) => (
        (conversation.participants ?? []).map((participant) => (
            String(participant._id ?? participant)
        ))
    )))];
    if (!participantIds.length) return [];

    const users = await userModel.find({ _id: { $in: participantIds } })
        .select('following blockedUsers')
        .lean();
    return conversations.filter((conversation) => areParticipantsEligible(
        users,
        (conversation.participants ?? []).map((participant) => (
            String(participant._id ?? participant)
        ))
    ));
}

module.exports = {
    areParticipantsEligibleById,
    filterEligibleConversations
};
