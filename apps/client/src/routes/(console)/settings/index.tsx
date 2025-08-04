// Route Component (settings/index.tsx)
import { createFileRoute } from "@tanstack/react-router";
import Balance from "./-components/Balance";
import { authUserData } from "@/lib/auth-handler";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getOrganizationBalanceQO } from "@/services/queries";

export const Route = createFileRoute("/(console)/settings/")({
  loader: async ({ context: { queryClient, auth } }) => {
    const userData = await authUserData(auth);

    await queryClient.ensureQueryData(
      getOrganizationBalanceQO({
        type: "organizations",
        query: {
          method: "getOrganizationBalance",
          data: {
            currency: "COP",
          },
        },
        userData,
      })
    );

    return { userData };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { userData } = Route.useLoaderData();

  const { data: getBalance, refetch } = useSuspenseQuery(
    getOrganizationBalanceQO({
      type: "organizations",
      query: {
        method: "getOrganizationBalance",
        data: {
          currency: "COP",
        },
      },
      userData,
    })
  );

  console.log(getBalance);
  const { balanceInUsdCents, rate } = getBalance;

  return (
    <div className="p-4">
      <Balance
        amount={balanceInUsdCents}
        currency="COP"
        rate={rate}
        userData={userData}
        refetch={refetch}
      />
    </div>
  );
}
