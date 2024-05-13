import {Pool, PoolClient} from "pg";
import {ErrorType, Lobby, LogLevel, OpResult, Story, StoryElement, User} from "../../shared/sharedTypes";


export const dbTransaction = async (pool: Pool, callback: (client: PoolClient) => Promise<OpResult<any>>): Promise<OpResult<any>> => {
    const clientRes = await dbBeginTransaction(pool);
    if (!clientRes.success || !clientRes.data) return clientRes;
    const result = await callback(clientRes.data);
    if (result.success) {
        const commitRes = await dbCommitTransaction(clientRes.data);
        if(!commitRes.success) return commitRes;
        return result
    } else {
        const rollbackRes = await dbRollbackTransaction(clientRes.data);
        if(!rollbackRes.success) return rollbackRes;
        return result;
    }
}


const dbBeginTransaction = async (pool: Pool): Promise<OpResult<PoolClient>> => {
    try {
        const client = await pool.connect();
        await client.query('BEGIN');
        return {success: true, data: client};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_BEGIN,
                logLevel: LogLevel.Error,
                error: error
            }
        };
    }

};
const dbCommitTransaction = async (client: PoolClient): Promise<OpResult<null>> => {
    try {
        await client.query('COMMIT');
        client.release();
        return {success: true};
    } catch (error){
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_COMMIT,
                logLevel: LogLevel.Error,
                error: error
            }
        }
    }
};
const dbRollbackTransaction = async (client: PoolClient): Promise<OpResult<null>> => {
    try {
        await client.query('ROLLBACK');
        client.release();
        return {success: true};
    } catch (error){
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_ROLLBACK,
                logLevel: LogLevel.Error,
                error: error
            }
        }
    }
};

const dbSelectStoryElements = async (db: (Pool | PoolClient), storyId: number): Promise<OpResult<StoryElement[]>> => {
    try {
        const res = await db.query(`SELECT *
                                    FROM story_elements
                                    WHERE story_id = $1`, [storyId]);
        const data = res.rows;
        const storyElements = data.map(row => ({
            index: row.index,
            userId: row.user_id,
            storyId: row.story_id,
            round: row.round,
            type: row.type,
            content: row.content
        }));
        return {success: true, data: storyElements};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_SELECT_STORY_ELEMENTS,
                logLevel: LogLevel.Error,
                error: error
            }
        };
    }
};
export const dbSelectStoryWithIndex = async (db: (Pool | PoolClient), storyIndex: number, lobbyCode: string): Promise<OpResult<Story>> => {
    try {
        const res = await db.query(`SELECT *
                                    FROM stories
                                    WHERE lobby_code = $1
                                      AND index = $2`, [lobbyCode, storyIndex]);
        const data = res.rows;
        if (!data || data.length === 0) {
            return {
                success: false,
                error: {
                    type: ErrorType.STORY_BY_INDEX_NOT_FOUND,
                    logLevel: LogLevel.Warning,
                    error: "Story not found by index"
                }
            };
        }
        const story = data[0];
        const storyElementsRes = await dbSelectStoryElements(db, story.id);
        if (!storyElementsRes.success || !storyElementsRes.data) return {success: false, error: storyElementsRes.error};
        return {
            success: true,
            data: {
                id: story.id,
                index: story.index,
                lobbyCode: story.lobby_code,
                name: story.name,
                elements: storyElementsRes.data
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_SELECT_STORY,
                logLevel: LogLevel.Error,
                error: error
            }
        };
    }

};
const dbSelectUsersForLobby = async (db: (Pool | PoolClient), lobbyCode: string): Promise<OpResult<User[]>> => {
    try {
        const res = await db.query(`SELECT *
                                    FROM users
                                    WHERE lobby_code = $1
                                    ORDER BY created_at`, [lobbyCode]);
        const data = res.rows;
        const users = data.map(row => ({id: row.id, nickname: row.nickname, lobbyCode: row.lobby_code}));
        return {success: true, data: users};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_SELECT_USERS,
                logLevel: LogLevel.Error,
                error: error
            }
        };
    }
};

export const dbSelectLobbyCount = async (db: (Pool | PoolClient), lobbyCode: string): Promise<OpResult<number>> => {
    try {
        const res = await db.query(`SELECT COUNT(*)
                                    FROM lobbies
                                    WHERE code = $1`, [lobbyCode]);
        const data = res.rows;
        const count = parseInt(data[0].count);
        return {success: true, data: count};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_SELECT_LOBBY_COUNT,
                logLevel: LogLevel.Error,
                error: error
            }
        };
    }

}


export const dbSelectLobby = async (db: (Pool | PoolClient), lobbyCode: string, lock = false): Promise<OpResult<Lobby>> => {
    try {
        const res = await db.query(`SELECT *
                                    FROM lobbies
                                    WHERE code = $1
                                        ${lock ? 'FOR UPDATE' : ''}`, [lobbyCode]);

        const data = res.rows;
        if (!data || data.length === 0) {
            return {
                success: false,
                error: {
                    type: ErrorType.LOBBY_NOT_FOUND,
                    logLevel: LogLevel.Warning,
                    error: "Lobby not found"
                }
            };
        }
        const usersRes = await dbSelectUsersForLobby(db, lobbyCode);
        if (!usersRes.success || !usersRes.data) return {success: false, error: usersRes.error};
        const lobby : Lobby = {
            code: lobbyCode,
            hostUserId: data[0].host_user_id,
            round: data[0].round,
            usersSubmitted: data[0].users_submitted,
            roundStartAt: data[0].round_start_at ? new Date(data[0].round_start_at) : null,
            roundEndAt: data[0].round_end_at ? new Date(data[0].round_end_at) : null,
            users: usersRes.data
        };
        return {success: true, data: lobby};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_SELECT_LOBBY,
                logLevel: LogLevel.Error,
                error: error
            }
        };
    }
}
export const dbSelectStoryByIndex = async (db: (Pool | PoolClient), lobbyCode: string, index: number): Promise<OpResult<Story>> => {
    try {
        const res = await db.query(`SELECT *
                                    FROM stories
                                    WHERE lobby_code = $1
                                      AND index = $2`, [lobbyCode, index]);
        const data = res.rows;
        if (!data || data.length === 0) {
            return {
                success: false,
                error: {
                    type: ErrorType.STORY_NOT_FOUND,
                    logLevel: LogLevel.Warning,
                    error: "Story not found"
                }
            };
        }
        const storyData = data[0];
        const storyElementsRes = await dbSelectStoryElements(db, storyData.id);
        if (!storyElementsRes.success || !storyElementsRes.data) return {success: false, error: storyElementsRes.error};
        const story: Story = {
            id: storyData.id,
            index: storyData.index,
            lobbyCode: storyData.lobby_code,
            name: storyData.name,
            elements: storyElementsRes.data
        };
        return {success: true, data: story};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_SELECT_STORY_BY_INDEX,
                logLevel: LogLevel.Error,
                error: error
            }
        };
    }
};
export const dbSelectInactiveUsers = async (db: (Pool | PoolClient), seconds: number): Promise<OpResult<User[]>> => {
    try {
        const res = await db.query(`SELECT *
                                    FROM users
                                    WHERE NOW() - last_active > INTERVAL '${seconds}' SECOND`);
        const data = res.rows;
        const users : User[] = data.map(row => ({
            id: row.id,
            nickname: row.nickname,
            lobbyCode: row.lobby_code,
            lastActive: row.last_active
        }));
        return {success: true, data: users};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_SELECT_INACTIVE_USERS,
                logLevel: LogLevel.Error,
                error: error
            }
        };
    }
};

export const dbSelectUserLobbyCode = async (db: (Pool | PoolClient), userId: string): Promise<OpResult<string | null>> => {
    try {
        const res = await db.query(`SELECT lobby_code
                                    FROM users
                                    WHERE id = $1`, [userId]);
        const data = res.rows;
        if (!data || data.length === 0) {
            return {
                success: false,
                error: {
                    type: ErrorType.USER_NOT_FOUND,
                    logLevel: LogLevel.Warning,
                    error: "User not found"
                }
            };
        }
        const lobbyCode = data[0].lobby_code;
        return {success: true, data: lobbyCode};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_SELECT_USER_LOBBY_CODE,
                logLevel: LogLevel.Error,
                error: error
            }
        };
    }
};
export const dbSelectStoryElementDistinctUserIdsForRound = async (db: (Pool | PoolClient), lobbyCode: string, round: number): Promise<OpResult<string[]>> => {
    try {
        const res = await db.query(`SELECT DISTINCT user_id
                                    FROM story_elements
                                    WHERE story_id IN (SELECT id
                                                       FROM stories
                                                       WHERE lobby_code = $1)
                                      AND round = $2`, [lobbyCode, round]);
        const data = res.rows;
        const userIds = data.map(row => row.user_id);
        return {success: true, data: userIds};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_SELECT_LAST_USER_IDS_IN_LOBBY,
                logLevel: LogLevel.Error,
                error: error
            }
        };
    }
};
export const dbSelectStoryIdByIndex = async (db: (Pool | PoolClient), lobbyCode: string, index: number): Promise<OpResult<number>> => {
    try {
        const res = await db.query(`SELECT id
                                    FROM stories
                                    WHERE lobby_code = $1
                                      AND index = $2`, [lobbyCode, index]);
        const data = res.rows;
        if (!data || data.length === 0) {
            return {
                success: false,
                error: {
                    type: ErrorType.STORY_BY_INDEX_NOT_FOUND,
                    logLevel: LogLevel.Warning,
                    error: "Story not found by index"
                }
            };
        }
        const storyId = data[0].id;
        return {success: true, data: storyId};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_SELECT_STORY_ID_BY_INDEX,
                logLevel: LogLevel.Error,
                error: error
            }
        };
    }
};
export const dbInsertStory = async (db: (Pool | PoolClient), story: Story): Promise<OpResult<null>> => {
    try {
        await db.query(`INSERT INTO stories (index, lobby_code, name)
                        VALUES ($1, $2, $3)`, [story.index, story.lobbyCode, story.name]);
        return {success: true};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_INSERT_STORY,
                logLevel: LogLevel.Error,
                error: error
            }
        }
    }
};
export const dbInsertStoryElements = async (db: (Pool | PoolClient), elements: StoryElement[]): Promise<OpResult<null>> => {
    try {
        const query = `INSERT INTO story_elements (index, user_id, story_id, round, type, content)
                       VALUES ` + elements.map((_element, index) => `($${index * 6 + 1}, $${index * 6 + 2}, $${index * 6 + 3}, $${index * 6 + 4}, $${index * 6 + 5}, $${index * 6 + 6})`).join(', ');
        await db.query(query, elements.flatMap(element => [element.index, element.userId, element.storyId, element.round, element.type, element.content]));
        return {success: true};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_INSERT_STORY_ELEMENTS,
                logLevel: LogLevel.Error,
                error: error
            }
        }
    }
};
export const dbInsertLobby = async (db: (Pool | PoolClient), lobby: Lobby): Promise<OpResult<null>> => {
    try {
        await db.query(`INSERT INTO lobbies (code, host_user_id, round, users_submitted, round_start_at, round_end_at)
                        VALUES ($1, $2, $3, $4, $5, $6)`,
            [lobby.code, lobby.hostUserId, lobby.round, lobby.usersSubmitted, lobby.roundStartAt, lobby.roundEndAt]);
        return {success: true};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_INSERT_LOBBY,
                logLevel: LogLevel.Error,
                error: error
            }
        }
    }
}
export const dbUpsertUser = async (db: (Pool | PoolClient), user: User): Promise<OpResult<null>> => {
    try {
        await db.query(`INSERT INTO users (id, nickname, lobby_code)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (id) DO UPDATE SET nickname    = $2,
                                                       last_active = NOW()`, [user.id, user.nickname, user.lobbyCode]);
        return {success: true};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_UPSERT_USER,
                logLevel: LogLevel.Error,
                error: error
            }
        }
    }
}
export const dbUpdateUserLastActive = async (db: (Pool | PoolClient), userId: string): Promise<OpResult<null>> => {
    try {
        await db.query(`UPDATE users
                        SET last_active = NOW()
                        WHERE id = $1`, [userId]);
        return {success: true};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_UPDATE_USER_LAST_ACTIVE,
                logLevel: LogLevel.Error,
                error: error
            }
        }
    }
};
export const dbUpdateUserLobbyCode = async (db: (Pool | PoolClient), userId: string, lobbyCode: string | null): Promise<OpResult<null>> => {
    try {
        if (lobbyCode === null) {
            await db.query(`UPDATE users
                            SET lobby_code = NULL
                            WHERE id = $1`, [userId]);
        } else {
            await db.query(`UPDATE users
                            SET lobby_code = $1
                            WHERE id = $2`, [lobbyCode, userId]);
        }
        return {success: true};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_UPDATE_USER_LOBBY_CODE,
                logLevel: LogLevel.Error,
                error: error
            }
        }
    }
}
export const dbUpdateLobbyHost = async (db: (Pool | PoolClient), lobbyCode: string, hostUserId: string): Promise<OpResult<null>> => {
    try {
        await db.query(`UPDATE lobbies
                        SET host_user_id = $1
                        WHERE code = $2`, [hostUserId, lobbyCode]);
        return {success: true};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_UPDATE_LOBBY_HOST,
                logLevel: LogLevel.Error,
                error: error
            }
        }
    }
};
export const dbUpdateLobbyUsersSubmittedIncrement = async (db: (Pool | PoolClient), lobbyCode: string): Promise<OpResult<null>> => {
    try {
        await db.query(`UPDATE lobbies
                        SET users_submitted = users_submitted + 1
                        WHERE code = $1`, [lobbyCode]);

        return {success: true};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_UPDATE_LOBBY_USERS_SUBMITTED,
                logLevel: LogLevel.Error,
                error: error
            }
        }
    }
};
export const dbUpdateLobbyUsersSubmitted = async (db: (Pool | PoolClient), lobbyCode: string, usersSubmitted: number): Promise<OpResult<null>> => {
    try {
        await db.query(`UPDATE lobbies
                        SET users_submitted = $1
                        WHERE code = $2`, [usersSubmitted, lobbyCode]);
        return {success: true};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_UPDATE_LOBBY_USERS_SUBMITTED,
                logLevel: LogLevel.Error,
                error: error
            }
        }
    }
};
export const dbUpdateLobbyRound = async (db: (Pool | PoolClient), lobbyCode: string, round: number, roundStartAt: (Date | null), roundEndAt: (Date | null)): Promise<OpResult<null>> => {
    try {
        await db.query(`UPDATE lobbies
                        SET round = $1,
                            round_start_at = $2,
                            round_end_at = $3
                        WHERE code = $4`, [round, roundStartAt, roundEndAt, lobbyCode]);
        return {success: true};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_UPDATE_LOBBY_ROUND,
                logLevel: LogLevel.Error,
                error: error
            }
        }
    }
}
export const dbDeleteUser = async (db: (Pool | PoolClient), userId: string): Promise<OpResult<null>> => {
    try {
        await db.query(`DELETE
                        FROM users
                        WHERE id = $1`, [userId]);
        return {success: true};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_DELETE_USER,
                logLevel: LogLevel.Error,
                error: error
            }
        }
    }
};
export const dbDeleteLobby = async (db: (Pool | PoolClient), lobbyCode: string): Promise<OpResult<null>> => {
    try {
        await db.query(`DELETE
                        FROM lobbies
                        WHERE code = $1`, [lobbyCode]);
        return {success: true};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_DELETE_LOBBY,
                logLevel: LogLevel.Error,
                error: error
            }
        }
    }

}
export const dbDeleteAllStories = async (db: (Pool | PoolClient), lobbyCode: string): Promise<OpResult<null>> => {
    try {
        await db.query(`DELETE
                        FROM stories
                        WHERE lobby_code = $1`, [lobbyCode]);
        // story elements are deleted automatically due to the foreign key constraint
        return {success: true};
    } catch (error) {
        return {
            success: false,
            error: {
                type: ErrorType.DB_ERROR_DELETE_STORIES,
                logLevel: LogLevel.Error,
                error: error
            }
        }
    }
};