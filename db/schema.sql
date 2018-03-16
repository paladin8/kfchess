CREATE TABLE users (
    id           BIGSERIAL PRIMARY KEY,
    email        TEXT UNIQUE,
    username     TEXT UNIQUE,
    picture_url  TEXT,
    ratings      JSONB,
    join_time    TIMESTAMP WITHOUT TIME ZONE
);
