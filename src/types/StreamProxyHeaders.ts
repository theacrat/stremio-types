export type StreamProxyHeaders = {
	request?: { [key in string]?: string };
	response?: { [key in string]?: string };
};
