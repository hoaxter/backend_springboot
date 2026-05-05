import { Client } from '@stomp/stompjs';

let stompClient = null;
const subscriptions = {};

export function connectWebSocket(onConnect) {
  if (stompClient?.connected) { onConnect?.(); return; }

  const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/websocket`;

  stompClient = new Client({
    brokerURL: wsUrl,
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    onConnect: () => { console.log('WebSocket connected'); onConnect?.(); },
    onStompError: (frame) => { console.error('STOMP error', frame); },
    onWebSocketError: (event) => { console.error('WebSocket error', event); }
  });
  stompClient.activate();
}

export function subscribe(destination, callback) {
  if (!stompClient?.connected) {
    setTimeout(() => subscribe(destination, callback), 500);
    return;
  }
  if (subscriptions[destination]) subscriptions[destination].unsubscribe();
  subscriptions[destination] = stompClient.subscribe(destination, msg => {
    callback(JSON.parse(msg.body));
  });
}

export function unsubscribe(destination) {
  if (subscriptions[destination]) {
    subscriptions[destination].unsubscribe();
    delete subscriptions[destination];
  }
}

export function sendMessage(destination, body) {
  if (stompClient?.connected) {
    stompClient.publish({ destination, body: JSON.stringify(body) });
  }
}

export function disconnectWebSocket() {
  if (stompClient) { stompClient.deactivate(); stompClient = null; }
}
