export type JsonFilter = {
	path?: string; // sólo cuando operator != '@>'
	operator: '=' | '>=' | '<=' | 'LIKE' | 'ILIKE' | 'IN' | '@>';
	value: string | number | string[] | Record<string, any>;
};
