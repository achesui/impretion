type SagaPattern = {
	dispatch: (compensation: () => void | Promise<void>) => void;
	cancel: () => void;
	success: () => void;
};

export const sagaPattern = (): SagaPattern => {
	let compensations: Array<() => void | Promise<void>> = [];

	return {
		dispatch: (compensation: () => void | Promise<void>) => {
			compensations.push(compensation);
		},
		cancel: async () => {
			const results = await Promise.allSettled(
				compensations.map(async (compensation) => {
					try {
						const result = compensation();
						if (result instanceof Promise) {
							await result;
						}
					} catch (error) {
						// Log error individual sin detener la ejecución
						console.error('Error ejecutando compensación:', error);
						// Opcional: Envía a la base de datos para un log persistente
					}
				})
			);

			// Log de resultados si es necesario
			results.forEach((result, index) => {
				if (result.status === 'rejected') {
					console.error(`Compensación ${index + 1} falló:`, result.reason);
				} else {
					console.log(`Compensación ${index + 1} completada con éxito.`);
				}
			});

			// Limpia las compensaciones
			compensations = [];
		},
		success: () => {
			compensations = [];
		},
	};
};
