export type BridgeInvoke<Args, Result> = {
  invoke: (args: Args) => Promise<Result>;
};

export type BridgeListener<Payload> = {
  listen: (handler: (payload: Payload) => void) => () => void;
};
