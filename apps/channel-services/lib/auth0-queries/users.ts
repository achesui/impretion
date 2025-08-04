const headers = new Headers();
headers.append("Accept", "application/json");

export const getUser = async (
  token: string,
  userId: string,
  queryParams:
    | {
        include_fields: string;
        fields: string;
      }
    | {}
) => {
  headers.append("Authorization", `Bearer ${token}`);
  const data = await fetch(
    `https://dev-xw3cts5yn7mqyar7.us.auth0.com/api/v2/users/${userId}${
      queryParams ? `?${new URLSearchParams(queryParams)}` : ""
    }`,
    {
      method: "GET",
      headers,
    }
  );
  return data.json();
};
