# About OAuth 2.0 and OpenID connect
OAuth 2.0 is a popular protocol used for authorization on the internet. Authorization means specifying the priveleges of someone/something accessing a resource. This is not to be confused with authentication, which is verifying the identity of someone accessing a resource. OAuth 2.0 is the protocol at work when you enter a website that lets you login using Google, Facebook, Github etc. When you press the link for login, the website, I.E. the client, sends the user to the authorization server where the user types in its credentials and grants certain priveleges to the website. This allows for safer and simpler handling of user credentials. 

Some terminology
* Resource owner: Owner of the resource that the client wants access to. 
* Client: The application requesting access to a resource.
* Authorization server: System used for authorizing the client. 
* Resource server: System holding the resource that the client wants access to. Could be the same as the authorization server. 
* Scopes: type of privelege that the client is granted.
* Redirect URI: Where to send the user after authorization has finished. 
* Access Token: Proof that the client has been authorized
* Backchannel: A highly secure communication channel between two applications. If a web application uses its backend to communicate with a server, it uses the backchannel.
* Flow: Procedure for exchanging the access tokem. 

There are several `flows` that may be used to accuire the `access token`. The most common and secure flow is the authorization code flow. This is when the browser recieves a code from the `authorization server` and the backend sends it back with the client-secret. We say that browser to server communication goes over the frontchannel, whereas server to server communication happens over the backchannel. We can trust the backchannel for exchanging the access token because it is a lot more secure than the frontchannel. 

The `access token` flow typically starts with the `resource owner` pressing the "Sign in with Google" button on the `client` webpage. The `client` redirects her to the "/authorize" endpoint on the `authorization server` with a `redirect URI`. The `authorization server` lets the `resource owner` sign in and add `scopes` for the `client`. Subsequentily, the `resource owner` is sent to the `redirect URI` with the authorization code. Using its `backchannel`, the `client` passes the authorization code and the client secret to the authorization server, and receives an access token that can be used to access the resource. 

Alas, Single Page Applications have no backchannel through which it may exchange the authorization code for an access token. Traditionally for this case, the token has been given to the client over the frontchannel thus removing a layer of security. This is called the "implicit flow" and was the standard until the IETF adviced against it in their [2018 paper on best practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics-09#section-2.1.2). They later proposed [using the Proof Key for Code Exchange, PKCE (pronounced pixie), extension](https://tools.ietf.org/html/draft-ietf-oauth-browser-based-apps-00#section-7) to the OAuth 2.0 authorization code flow. In the authorization code with pkce FLOW, the client must create a code verifier and a code challenge. The code verifier is a random string and the code challenge is the hash value of that random string. The code challenge is included in the authorize request. Then later, in the token exchange request, the code verifier is included. This flow is recommended for cases where there is no safe way to store a secret, and the communication is prone to interception.

## OpenID Connect
OAuth 2.0 was designed for giving permissions, not for sharing user information. That is why they designed OpenID Connect, OIDC, which is a layer on top of OAuth 2.0. It provides a standardized way of getting user information through the OAuth 2.0 protocol. By asking for the `openid` scope when starting a session, you will also receive an identity token in addition to the access token. The identity token is a Json Web Token, and is valid for a set amount of time. Additionally asking for the `profile` scope will populate the identity token with user information.  

![Authorization code flow with PKCE](https://raw.githubusercontent.com/kimrs/blog/master/OpenID_Connect_and_SPAs_explained/res/authorization_code_w_pkce.jpg)

# A practical example
## Create an Auth0 client
In the auth0 dashboard click the `+ CREATE APPLICATION` button.
Give the application a name and chose Single Page Web Applications

![Create application](https://raw.githubusercontent.com/kimrs/blog/master/OpenID_Connect_and_SPAs_explained/res/Auth0_01.png)

Auth0 will take you to a dashboard where you may configure the app and see the Client ID and the Client secret. Under the `Settings` tab add `http://localhost:8080` to the `Allowed Callback URLs` section. This way, by configuring a local server to listen to port 8080, we may catch the response from the authorization server.

![Add callback URL](https://raw.githubusercontent.com/kimrs/blog/master/OpenID_Connect_and_SPAs_explained/res/Auth0_02.png)

## Listen for response from authorization server
In order to catch the authorization code, we will start a web server that listens to http://localhost:8080 and writes the url in the client request to STDOUT.

```javascript
// server.js
var http = require('http');

http.createServer(function (req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    console.log(body);
    res.end('ok');
  });

}).listen(8080)
```
```bash
node server.js
```
## Sign in
According to [RFC7636](https://tools.ietf.org/html/rfc7636#section-4.1), the "code_verifier" is a cryptographic random string using the characters `[A-Z]/[a-z]/[0-9]/"-"/"."/"_"/"~"` with a minimum length of 43 characters and a maximum length of 128 characters. 

```bash
cat /dev/urandom          \
| tr -cd '[:alnum:]_.~-'  \
| fold -w 43              \
| head -n 1
8i12XE.KUkc4GPnXztOd3jtDNgwDqX20gho59kuKGP~
```
The code challenge is derived from the code verifier. It is recommended to use a hash value, but for test purposes, we may keep it plain. I.E equal to the code verifier. 
```bash
echo 8i12XE.KUkc4GPnXztOd3jtDNgwDqX20gho59kuKGP \
| shasum -a 256   \
| cut -d " " -f 1 \
| xxd -r -p       \
| base64 \
| tr / _ | tr + = | tr -d =

W3Z3xkPNrhH9sPXraFiomFvY-FLtFI7fFeIl6fcZkME
```

Next, we construct a sign in URL using the `authorize` endpoint. By following the link, the user will be redirected to a sign in page followed by a page explaining the permissions she is about give. 
In our case, we will need the profile information, which requires two scopes: openid and profile. The openid scope utilizes the OIDC implementation on the authorization server to return an id_token along with the access_token. The profile scope populates the id token with user information. Required parameters for the authorize url are
* client_id: Found in the settings page for this client on auth0.com. 
* redirect_uri: Where to direct the user once authorization is finished.
* scope: Space delimited list of strings that defines the priveleges requested by the client. 
* response_type: Can be set to token or code. Code is safer.
* response_mode: How the response data should be presented. 

```
open https://sober.eu.auth0.com/authorize?client_id=BK7iS32Y9QanjdGCLZk499DJ30t7jp0N&redirect_uri=http%3A%2F%2Flocalhost%3A8080&scope=openid%20profile&code_challenge=W3Z3xkPNrhH9sPXraFiomFvY-FLtFI7fFeIl6fcZkME&code_challenge_method=S256&response_type=code&response_mode=form_post&nonce=2vcjjlduyzc
```

After sign in, the authorization server associates the `code_challenge` with the authorization code so that it can be verified later. The code is sent to the 'redirect_uri` where our node server listens and prints:

```bash
code=1853Sxx4h4eNKrsB&state=g6Fo2SBuZHNKcVBEMUlPQ3lHWEZiUGpSSHhIWURXc21QTkppeqN0aWTZIF9FWkpFaHprQUdPYml1ZDZ2OXNSM1Bqcm96RTMyLWlXo2NpZNkgQks3aVMzMlk5UWFuamRHQ0xaazQ5OURKMzB0N2pwME4
```
## Exchange authorization code for token 
Lastly, to recieve the ID token, we will send the authorization code and the code verifier to the token endpoint on the authorization server.
The ID token is a Json Web Token, JWT, and consists of a base64 encoded header, payload and signature. Validation of JWT involves encoding the header and payload with information found in the JWT and comparing it with the signature. Its specifics are beyond the scope of this article but the procedure is described in [RFC7519](https://tools.ietf.org/html/rfc7519#section-7.2). The long sought after user information can be seen by base64 decoding the payload. Alternatively you may use [jwt.io](https://jwt.io/#debugger-io?token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijg1c1ZGNW5Vdl9CS2tiWF9pTUVzTSJ9.eyJnaXZlbl9uYW1lIjoiS2ltIFJ1bmUiLCJmYW1pbHlfbmFtZSI6IlNvbHN0YWQiLCJuaWNrbmFtZSI6ImtpbXJ1bmVzb2xzdGFkODkiLCJuYW1lIjoiS2ltIFJ1bmUgU29sc3RhZCIsInBpY3R1cmUiOiJodHRwczovL2xoNC5nb29nbGV1c2VyY29udGVudC5jb20vLVRZeVduLTRQX3RrL0FBQUFBQUFBQUFJL0FBQUFBQUFBQUFBL0FNWnV1Y21DU05zeE9nVGRaa05PR1BjLWQ5aG56RGNfV3cvcGhvdG8uanBnIiwibG9jYWxlIjoibm8iLCJ1cGRhdGVkX2F0IjoiMjAyMC0wOS0yOFQxMjoyNjo0Ni43OTBaIiwiaXNzIjoiaHR0cHM6Ly9zb2Jlci5ldS5hdXRoMC5jb20vIiwic3ViIjoiZ29vZ2xlLW9hdXRoMnwxMTA0MzEyMTE3NzQ4MjgzMTA3MTIiLCJhdWQiOiJCSzdpUzMyWTlRYW5qZEdDTFprNDk5REozMHQ3anAwTiIsImlhdCI6MTYwMTI5NjE0MSwiZXhwIjoxNjAxMzMyMTQxLCJub25jZSI6IjJ2Y2pqbGR1eXpjIn0.hPKkDXd7zX8IDXBmxv7yzzmp9sdxqTTaGF3Ml5sRvkCf_89hr72B62w5sprBgz7jjF4HcvgypN9BMaxFNUM0SHjtbQKvYj5yUgZim7b7QbmyJh1Pu-YppVXhVuDwiDj0aWuRzFyxfEW39ZksYVJ3BcEhSl1ejq0-egkgiYVHMGu52enR5mr2vd3fNEjZDhDFAouL2XX1LWERxHTuSvICnhxjrmmBQ_rBs65eK9zmRGf8GM3VTPU00N7W6VE6CkA8swsV0SxSSOdPZzS8TJPIX6jHxbz9mdF31EVv43a2oEH8S3MfOf2a6yznWKP_UcAW2SgDDLb6xW1vEAZe-93QiA&publicKey=-----BEGIN%20PUBLIC%20KEY-----%0AMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAo20nae36OLb2itnd6tUy%0AotU2%2FtfAhKhZqatn4CiOyymRFxWktad4xzu65Kuwv0ggxUqyciLMlR0PTgDItas%2F%0Azdxjg8FhUkoepcq69l0GR3OtRBYBIGq%2BZ0c9TRp%2FDSw7YAN8TIcqlI90MTGljTHk%0AcRJpLlS6kdh7wlGFmeFXcRUqBbkzvsoHxfJspD25X7DCey02CczJ8hfIjnlKCdH4%0AxTvkL3KlWDxwI1xQc9nCq2TrsBe%2F4l428VY8FXRi0%2BuPgM7SKQepBeUw37G%2FOndK%0AnBmPxyQ452G62ML3ZkSvEN0hQ4q6d%2FRxHHsdwcti6xayE0SPoHEzECzekGm9Q0k%2B%0AsQIDAQAB%0A-----END%20PUBLIC%20KEY-----%0A)

```bash
cat data_sign_in.json
{
    "grant_type":"authorization_code",
    "code":"1853Sxx4h4eNKrsB",
    "redirect_uri":"http://localhost:8080",
    "client_id":"BK7iS32Y9QanjdGCLZk499DJ30t7jp0N",
    "code_verifier":"8i12XE.KUkc4GPnXztOd3jtDNgwDqX20gho59kuKGP~",
    "audience":"https://soberapi.solstad.dev/"
}
curl --request POST \
        --url https://sober.eu.auth0.com/oauth/token \
        --header 'content-type: application/json' \
        --data (cat data_sign_in.json | tr -d " \t\n\r") \
        | tee token.json \
        | jq
{
  "access_token": "J2zjE7nk9_W6WG-cb_F6KHRCS3bZEqV3",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijg1c1ZGNW5Vdl9CS2tiWF9pTUVzTSJ9.eyJnaXZlbl9uYW1lIjoiS2ltIFJ1bmUiLCJmYW1pbHlfbmFtZSI6IlNvbHN0YWQiLCJuaWNrbmFtZSI6ImtpbXJ1bmVzb2xzdGFkODkiLCJuYW1lIjoiS2ltIFJ1bmUgU29sc3RhZCIsInBpY3R1cmUiOiJodHRwczovL2xoNC5nb29nbGV1c2VyY29udGVudC5jb20vLVRZeVduLTRQX3RrL0FBQUFBQUFBQUFJL0FBQUFBQUFBQUFBL0FNWnV1Y21DU05zeE9nVGRaa05PR1BjLWQ5aG56RGNfV3cvcGhvdG8uanBnIiwibG9jYWxlIjoibm8iLCJ1cGRhdGVkX2F0IjoiMjAyMC0wOS0yOFQxMjoyNjo0Ni43OTBaIiwiaXNzIjoiaHR0cHM6Ly9zb2Jlci5ldS5hdXRoMC5jb20vIiwic3ViIjoiZ29vZ2xlLW9hdXRoMnwxMTA0MzEyMTE3NzQ4MjgzMTA3MTIiLCJhdWQiOiJCSzdpUzMyWTlRYW5qZEdDTFprNDk5REozMHQ3anAwTiIsImlhdCI6MTYwMTI5NjE0MSwiZXhwIjoxNjAxMzMyMTQxLCJub25jZSI6IjJ2Y2pqbGR1eXpjIn0.hPKkDXd7zX8IDXBmxv7yzzmp9sdxqTTaGF3Ml5sRvkCf_89hr72B62w5sprBgz7jjF4HcvgypN9BMaxFNUM0SHjtbQKvYj5yUgZim7b7QbmyJh1Pu-YppVXhVuDwiDj0aWuRzFyxfEW39ZksYVJ3BcEhSl1ejq0-egkgiYVHMGu52enR5mr2vd3fNEjZDhDFAouL2XX1LWERxHTuSvICnhxjrmmBQ_rBs65eK9zmRGf8GM3VTPU00N7W6VE6CkA8swsV0SxSSOdPZzS8TJPIX6jHxbz9mdF31EVv43a2oEH8S3MfOf2a6yznWKP_UcAW2SgDDLb6xW1vEAZe-93QiA",
  "scope": "openid profile",
  "expires_in": 86400,
  "token_type": "Bearer"
}
cat token.json              \
| jq -r .id_token           \
| awk -F. '{ print $2 }'    \ 
| base64 --decode           \ 
| sed 's/.*/&"}/g'          \ 
| jq
{
  "given_name": "Kim Rune",
  "family_name": "Solstad",
  "nickname": "kimrunesolstad89",
  "name": "Kim Rune Solstad",
  "picture": "https://lh4.googleusercontent.com/-TYyWn-4P_tk/AAAAAAAAAAI/AAAAAAAAAAA/AMZuucmCSNsxOgTdZkNOGPc-d9hnzDc_Ww/photo.jpg",
  "locale": "no",
  "updated_at": "2020-09-28T12:26:46.790Z",
  "iss": "https://sober.eu.auth0.com/",
  "sub": "google-oauth2|110431211774828310712",
  "aud": "BK7iS32Y9QanjdGCLZk499DJ30t7jp0N",
  "iat": 1601296141,
  "exp": 1601332141,
  "nonce": "2vcjjlduyzc"
}
```

# Conclusion






# Resources
https://developer.okta.com/blog/2019/05/01/is-the-oauth-implicit-flow-dead

https://www.youtube.com/watch?v=996OiexHze0\

https://auth0.com/docs/flows/authorization-code-flow-with-proof-key-for-code-exchange-pkce


https://anthonychu.ca/post/azure-functions-app-service-openid-connect-auth0/

https://tools.ietf.org/html/rfc7636#section-4.1