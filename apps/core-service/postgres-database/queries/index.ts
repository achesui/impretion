// Tipos generales

import { UserData } from '../../../global';
import { ActionQueryProps } from './actions/actions.d.types';
import { AssistantQueryProps } from './assistants/assistants.d.types';
import { ConnectionQueryProps } from './connections/connections.d.types';
import { CollectionQueryProps } from './knowledge-base/knowledge-base.d.types';
import { OrganizationQueryProps } from './organization/organizations.d.types';
import { TransactionQueryProps } from './transactions/transactions.d.types';
import { UserQueryProps } from './users/users.d.types';

export type MainDatabaseQueryProps =
	| { type: 'assistants'; userData: UserData; query: AssistantQueryProps }
	| { type: 'actions'; userData: UserData; query: ActionQueryProps }
	| { type: 'connections'; userData: UserData; query: ConnectionQueryProps }
	| { type: 'users'; userData: UserData; query: UserQueryProps }
	| { type: 'knowledgeBase'; userData: UserData; query: CollectionQueryProps }
	| { type: 'transactions'; userData: UserData; query: TransactionQueryProps }
	| { type: 'organizations'; userData: UserData; query: OrganizationQueryProps };
