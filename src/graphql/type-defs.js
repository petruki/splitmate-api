const typeDefs = `
    type Query { 
        events(category: String!): [Event],
        me: User
    }

    type Event {
        _id: ID,
        name: String,
        description: String,
        type: String,
        date: String,
        location: String,
        members: [String],
        v_members: [Member],
        organizer: String,
        v_organizer: Member,
        items: [Item],
        version: String
    }

    type Item {
        _id: ID,
        name: String,
        details: [ItemDetail],
        poll_name: String,
        poll: [Poll],
        created_by: String,
        assigned_to: String,
        v_created_by: Member,
        v_assigned_to: Member
    }

    type ItemDetail {
        type:  String,
        value: String
    }

    type Poll {
        value: String,
        votes: [String]
    }

    type UserInvite {
        _id: ID,
        email: String,
        eventid: String,
        createAt: String,
        updateAt: String,
        v_event: Event
    }

    type Member {
        _id: ID,
        name:  String,
        username: String
    }

    type User {
        _id: ID,
        name:  String,
        email: String,
        username: String,
        plan: String,
        token: String,
        events_pending: [String],
        events_archived: [String],
        v_events_pending: [Event],
        v_events_archived: [Event],
        v_plan: Plan
    }

    type Plan {
        _id: ID,
        name: String,
        enable_ads: Boolean,
        enable_invite_email: Boolean,
        max_events: Int,
        max_items: Int,
        max_poll_items: Int,
        max_members: Int
    }
`;

module.exports = typeDefs;