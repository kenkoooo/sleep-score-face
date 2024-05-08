import { CLIENT_ID, CLIENT_SECRET } from "../lib/env";

const SleepScoreFaceSettings = () => {
  return (
    <Page>
      <Section
        title={
          <Text bold align="center">
            Fitbit Account
          </Text>
        }
      >
        <Oauth
          settingsKey="oauth"
          title="Login"
          label="Fitbit"
          status="Login"
          authorizeUrl="https://www.fitbit.com/oauth2/authorize"
          requestTokenUrl="https://api.fitbit.com/oauth2/token"
          clientId={CLIENT_ID}
          clientSecret={CLIENT_SECRET}
          scope="sleep"
        />
      </Section>
    </Page>
  );
};

registerSettingsPage(SleepScoreFaceSettings);
