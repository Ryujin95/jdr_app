import { requestApi } from "../../../shared/api/httpClient.js";

const toArray = (data) => (Array.isArray(data) ? data : []);
const okTrue = () => true;

export const apiListFriends = (token, options = {}) =>
  requestApi("/friends", { token, ...options }).then(toArray);

export const apiListFriendRequests = (token, options = {}) =>
  requestApi("/friends/requests", { token, ...options }).then((data) => ({
    incoming: toArray(data?.incoming),
    outgoing: toArray(data?.outgoing),
  }));

export const apiSendFriendRequest = (token, userId, options = {}) =>
  requestApi("/friends/request", {
    token,
    method: "POST",
    body: { userId },
    ...options,
  });

export const apiAcceptFriendRequest = (token, friendshipId, options = {}) =>
  requestApi(`/friends/${encodeURIComponent(String(friendshipId))}/accept`, {
    token,
    method: "POST",
    ...options,
  });

export const apiDeclineFriendRequest = (token, friendshipId, options = {}) =>
  requestApi(`/friends/${encodeURIComponent(String(friendshipId))}/decline`, {
    token,
    method: "POST",
    ...options,
  });

export const apiRemoveFriend = (token, otherUserId, options = {}) =>
  requestApi(`/friends/${encodeURIComponent(String(otherUserId))}`, {
    token,
    method: "DELETE",
    ...options,
  }).then(okTrue);

export const apiGetFriendProfile = (token, otherUserId, options = {}) =>
  requestApi(`/friends/${encodeURIComponent(String(otherUserId))}/profile`, {
    token,
    method: "GET",
    ...options,
  });
