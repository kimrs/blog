![Authorized personnel onlu](https://raw.githubusercontent.com/kimrs/blog/master/OpenID_Connect_and_SPAs_explained/res/authorized_pers.jpg)
# About OAuth 2.0 and OpenID connect
OAuth 2.0 is a popular protocol used for authorization on the internet. Authorization means specifying the priveleges of someone/something accessing a resource. When an app asks a user for access to a resource she owns, such as her contact list, the app redirects her to a third party authorization server where she grants access to it. She, the resource owner, has authorized the app, the client, to use her contact list. The authorization server mints and returns an access token, with the scope for her contact list, back to the client. Subsequently, the client includes the access token in its request for the contact list to the resource server.

**_Warning:_** Authorization should not be confused with authentication which is when you verify the identity of someone. 

OAuth 2.0 was designed for giving permissions, not for authentication. That is why they designed OpenID Connect, OIDC, which is a small layer on top of OAuth 2.0. It provides a standardized way of getting user information through the OAuth 2.0 protocol. By asking for the *openid* scope when starting a session, you will receive an identity token in addition to the access token. The identity token is a Json Web Token, JWT, and valid for a set amount of time. Additionally asking for the *profile* scope will populate the identity token with user information.  

For the client to use the authorization server, the client must be registered by it and given a public *client ID* and possibly a private *client secret* only to be known by the client and the authorization server. 

## Client Credentials
A grant type, is a method through which the client obtains the *access token*. The client use it to prove its authenticity. The simplest grant type is *client credentials* and should only be used in server to server communication. With this grant type, the client gains an access token by sending the client ID and the client secret to the *token endpoint* on the authorization server. Which endpoints to use in communication with the authorization server can be found with the *openid-configuration* URL. This information is usually available on the authorization server's dashboard, but this URL is the [IETF](https://tools.ietf.org/html/rfc8414) standard to obtain information about interaction with authorization servers. 

**_Note:_** Grant types are often reffered to as flows.

```bash
curl  --request GET \
      --url https://sober.eu.auth0.com/.well-known/openid-configuration \
      | jq
{      
  "issuer": "https://sober.eu.auth0.com/",
  "authorization_endpoint": "https://sober.eu.auth0.com/authorize",
  "token_endpoint": "https://sober.eu.auth0.com/oauth/token",
  ...
}
```
In the following example, we retrieve the access token from the authorization server using the client credentials grant. For the entierity of this post, we will use [Auth0.com](https://auth0.com/) as authorization server. The first step in implementing any grant types is registering the application on the authorization server.  For the client credential flow to be used, we select "Machine to Machine Applications"

![Client Credentials](https://raw.githubusercontent.com/kimrs/blog/master/OpenID_Connect_and_SPAs_explained/res/Auth0_client_credentials_01.png)

Then we simply ask for the token by sending the *client id* and the *client secret* to the token endpoint. 

```Bash
cat data_sign_in.json
{
  "client_id":"VNQEv6jxX5O9zOJ9g2jUoI7css7qpX60",
  "client_secret":"Q6YwgZB7CFfUf829-ZmcKDRJSYXSpGvWe2qCCn0iGvVIxGpD7ju3Zj78quJJuYiT",
  "audience":"https://soberapi.solstad.dev/",
  "grant_type":"client_credentials"
}

curl --request POST                                 \
  --url https://sober.eu.auth0.com/oauth/token      \
  --header 'content-type: application/json'         \
  --data (cat data_sign_in.json | tr -d " \t\n\r")  \
  | jq
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijg1c1ZGNW5Vdl9CS2tiWF9pTUVzTSJ9.eyJpc3MiOiJodHRwczovL3NvYmVyLmV1LmF1dGgwLmNvbS8iLCJzdWIiOiJWTlFFdjZqeFg1Tzl6T0o5ZzJqVW9JN2NzczdxcFg2MEBjbGllbnRzIiwiYXVkIjoiaHR0cHM6Ly9zb2JlcmFwaS5zb2xzdGFkLmRldi8iLCJpYXQiOjE2MDE3OTYyNTUsImV4cCI6MTYwMTg4MjY1NSwiYXpwIjoiVk5RRXY2anhYNU85ek9KOWcyalVvSTdjc3M3cXBYNjAiLCJndHkiOiJjbGllbnQtY3JlZGVudGlhbHMifQ.Ltly-dvF8rKtl2ReYrYrRyG0q4f6tTyetBeCNUCNN80xFWqSlC1jjXNA4ev9ssg5PqU6QGrN1upxa8_oHSbrftTbWu9iPEkt3wITQcKvNxsxqeRvrFAHQx3JiIrFfwbxGl49xYT-4v2NLlhIZ1PvDSmjeKavu2WUHbnnPyEBP_2u3lV9H9RvjhgOuERs1U6WvOpkaw5M0dMtnP7ZEn7fiyFsaXjX4KSG4bZoAf9xRLEhY1VN1wOAEX6FIQUmJDUKIOFFfe2BoaTbpQmKwc_8OgUOgsIK9b3KNHU4_aAhMeuRl3Fpb2Vil64pggpMwCG9EP6lSuGycQ3wWoqZcJ7EQg",
  "expires_in": 86400,
  "token_type": "Bearer"
}
```
The access token may be used to make authorized requests to the resource server. As mentioned, the Client Credentials grant type is only to be used in server to server communication. For other cases, there are other grant types. 

## Authorization Code Grant Type
We cannot use the client credentials grant type for webapplications because there is no secure way to store the client secret in the browser. For web applications, the proposition is to use the "Authorization Code" grant type. This is when the frontend recieves a code from the authorization server and the backend sends it back with the client-secret. I.E an authorization code is received through the front channel and sent through the backchannel. We trust the backchannel, but not the frontchannel, for exchanging the access token because communication over the backchannel is hidden.

The Authorization Code grant type typically starts with the resource owner pressing the "Sign in with Google" button on the client webpage. The client redirects her to the *authorize* endpoint on the authorization server with a redirect URI. The authorization server lets the resource owner sign in and add scopes for the client. Subsequently, the resource owner is sent to the redirect URI with the authorization code. Using its backchannel, the client passes the authorization code and the client secret to the authorization server, and receives an access token that can be used to access the resource. 

**_Note_:** The authorization code is useless to anyone who does not know the client secret. Intruders who unjustly gained the code is not likely to obtain the access token. 

![Authorization code grant type](https://raw.githubusercontent.com/kimrs/blog/master/OpenID_Connect_and_SPAs_explained/res/authorization_code.jpg)

For the authorization code grant type to be used, "Regular Web Applications" must be selected when registering the app. 
![Authorization Code](https://raw.githubusercontent.com/kimrs/blog/master/OpenID_Connect_and_SPAs_explained/res/Auth0_authorization_code_01.png)
We set the allowed callback to be http://localhost:8080. This is where we will receive the code and the token from the authorization server.
![Authorization Code](https://raw.githubusercontent.com/kimrs/blog/master/OpenID_Connect_and_SPAs_explained/res/Auth0_authorization_code_02.png)

In order to catch the authorization code, we will start a web server that listens to http://localhost:8080 and prints out the post data.

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

Next, we construct a sign in URL using the *authorize* endpoint. By following the link, the user will be redirected to a sign in page followed by a page explaining the permissions she is about give. In our case, we will need the profile information, which requires two scopes: openid and profile. The openid scope utilizes the OIDC implementation on the authorization server to return an *id token* along with the *access token*. The profile scope populates the *id token* with user information. Required parameters for the authorize url are
* client_id: Found in the settings page for this client on auth0.com. 
* redirect_uri: Where to direct the user once authorization is finished.
* scope: Space delimited list of strings that defines the priveleges requested by the client. 
* response_type: Can be set to token or code. Code is safer.
* response_mode: How the response data should be presented. 

```
open https://sober.eu.auth0.com/authorize?client_id=BK7iS32Y9QanjdGCLZk499DJ30t7jp0N&redirect_uri=http%3A%2F%2Flocalhost%3A8080&scope=openid%20profile&response_type=code&response_mode=form_post
```
Lastly, we exchange the authorization code for the access token. The server we previously started prints out the authorization code. The output should be something like:
```bash
code=DRnYrDZDBEHdGrhj&state=g6Fo2SA2R09xNnlEeG1VRlFsaXBMRndMblZ2U1NxbmYzOWxvZKN0aWTZIGM0OFlFRGVad24tYXpfNmNLVkFyZ1dZTmwzZ2lHSVdNo2NpZNkgQks3aVMzMlk5UWFuamRHQ0xaazQ5OURKMzB0N2pwME4
```
The code part is the authorization code. Exchange this and the client secret for the access token using the token endpoint. For this grant type to be secure, this should happen from the backend.

```bash
cat data_sign_in.json
{
    "grant_type":"authorization_code",
    "redirect_uri":"http://localhost:8080",
    "client_id":"BK7iS32Y9QanjdGCLZk499DJ30t7jp0N",
    "audience":"https://soberapi.solstad.dev/",
    "code":"DRnYrDZDBEHdGrhj"
}
curl --request POST \
        --url https://sober.eu.auth0.com/oauth/token \
        --header 'content-type: application/json' \
        --data (cat data_sign_in.json | tr -d " \t\n\r") \
        | jq
{
  "access_token": "2FsL8cgBcPicvQAcicReKRpwCgZJCT-7",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijg1c1ZGNW5Vdl9CS2tiWF9pTUVzTSJ9.eyJnaXZlbl9uYW1lIjoiS2ltIFJ1bmUiLCJmYW1pbHlfbmFtZSI6IlNvbHN0YWQiLCJuaWNrbmFtZSI6ImtpbXJ1bmVzb2xzdGFkODkiLCJuYW1lIjoiS2ltIFJ1bmUgU29sc3RhZCIsInBpY3R1cmUiOiJodHRwczovL2xoNC5nb29nbGV1c2VyY29udGVudC5jb20vLVRZeVduLTRQX3RrL0FBQUFBQUFBQUFJL0FBQUFBQUFBQUFBL0FNWnV1Y21DU05zeE9nVGRaa05PR1BjLWQ5aG56RGNfV3cvcGhvdG8uanBnIiwibG9jYWxlIjoibm8iLCJ1cGRhdGVkX2F0IjoiMjAyMC0xMC0wNFQxMjo1ODoxOC41ODBaIiwiaXNzIjoiaHR0cHM6Ly9zb2Jlci5ldS5hdXRoMC5jb20vIiwic3ViIjoiZ29vZ2xlLW9hdXRoMnwxMTA0MzEyMTE3NzQ4MjgzMTA3MTIiLCJhdWQiOiJCSzdpUzMyWTlRYW5qZEdDTFprNDk5REozMHQ3anAwTiIsImlhdCI6MTYwMTgxNjM0OSwiZXhwIjoxNjAxODUyMzQ5fQ.YtxM30YQWgbcKzH0cphm3fXbk2j7JdN8RTTO4Q9PaL_7GUKneP4ay3WMjnLJEN3iniwWR3HM-4g3IGuYoEM175qPsPFvRZ9Er8nl_7nEQ6agzrHGGa77jyH8Sj_PuyQGSx4UF-PgN8lkub6BRldXEx5cmpgRHxfvCDVKipulangpiteVi1RnzrcXEkciuPMxaAg44cw0UKbnfhGLvDB2GZOf6JGdqXL9tH-VxKc3vYWfivQzITs4ciCnY8QhHXcqYGeFu2xevf2YORc4qSkBeR3D1-gTk4NUnizSAV9Vl4IyYaY_xQUHFzI2HmD6zqDfnsJMHStAyUaiZWowlpU3sQ",
  "scope": "openid profile",
  "expires_in": 86400,
  "token_type": "Bearer"
}
```
## Authorization Code With PKCE
Alas, Single Page Applications have no backchannel through which it may exchange the authorization code for an access token. Traditionally for this case, the Iplicit Flow was used. This grant type is similar to Authorization Code, but without the last step involving the client secret. The token was given to the client over the frontchannel thus removing a layer of security. This was the standard until the IETF adviced against it in their [2018 paper on best practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics-09#section-2.1.2). They later proposed using the [Proof Key for Code Exchange](https://tools.ietf.org/html/draft-ietf-oauth-browser-based-apps-00#section-7), PKCE (pronounced pixie), extension to the OAuth 2.0 authorization code flow. In the authorization code with PKCE flow, the client must create a code verifier and a code challenge. The code verifier is a random string and the code challenge is the hash value of that random string. The code challenge is included in the authorize request. Then later, in the token exchange request, the code verifier is included. This flow is recommended for cases where there is no safe way to store a secret, and where the communication is prone to interception.

![Authorization code flow with PKCE](https://raw.githubusercontent.com/kimrs/blog/master/OpenID_Connect_and_SPAs_explained/res/authorization_code_w_pkce.jpg)


In this last example, we will register the application as Single Page Application. Like the last time, set the 'Allowed Callbacks' to http://localhost:8080 and make sure the server we created in the previous example is started. 

```Bash
node server.js
```

![Create application](https://raw.githubusercontent.com/kimrs/blog/master/OpenID_Connect_and_SPAs_explained/res/Auth0_spa_01.png)

According to [RFC7636](https://tools.ietf.org/html/rfc7636#section-4.1), the "code_verifier" is a cryptographic random string using the characters `[A-Z]/[a-z]/[0-9]/"-"/"."/"_"/"~"` with a minimum length of 43 characters and a maximum length of 128 characters. We need to generate such a string before we can make the code challenge.  

```bash
cat /dev/urandom                      \
| LC_CTYPE=C tr -cd '[:alnum:]_.~-'   \
| fold -w 43                          \
| head -n 1
FLy2h8AP4IXo5~Od~Aeei7yJvcmwxjTs_Kv5O-e-1ah
```

The code challenge is derived from the code verifier. It can be plain, I.E equal to the code verifier, but using the hash value is recommended. The hash must be encoded as a base64url.

```bash
echo FLy2h8AP4IXo5~Od~Aeei7yJvcmwxjTs_Kv5O-e-1ah \
| shasum -a 256   \
| cut -d " " -f 1 \
| xxd -r -p       \
| base64          \
| tr / _ | tr + = | tr -d =

78ZgrApYA9Fsl9hBEZuuRK0aUUKKzUVF6v3dM7I5SPY
```
We include the code challenge in the sign in URL. Also, we have to tell the authorization server what method used for the code chalenge. Because we used a hash, this must be set to S256.

```
open https://sober.eu.auth0.com/authorize?client_id=3YfTh7XFUa7vtNuxUkSwa5HziyquYTI3&redirect_uri=http%3A%2F%2Flocalhost%3A8080&scope=openid%20profile&code_challenge=78ZgrApYA9Fsl9hBEZuuRK0aUUKKzUVF6v3dM7I5SPY&code_challenge_method=S256&response_type=code&response_mode=form_post&nonce=2vcjjlduyzc
```

After sign in, the authorization server associates the code_challenge with the authorization code so that it can be verified later. The code is sent to the 'redirect_uri` where our node server listens and prints:


```bash
code=1853Sxx4h4eNKrsB&state=g6Fo2SBuZHNKcVBEMUlPQ3lHWEZiUGpSSHhIWURXc21QTkppeqN0aWTZIF9FWkpFaHprQUdPYml1ZDZ2OXNSM1Bqcm96RTMyLWlXo2NpZNkgQks3aVMzMlk5UWFuamRHQ0xaazQ5OURKMzB0N2pwME4
```
Lastly, to recieve the ID token, we will send the authorization code and the code verifier to the token endpoint on the authorization server.

```bash
cat data_sign_in.json
{
    "grant_type":"authorization_code",
    "code":"1853Sxx4h4eNKrsB",
    "redirect_uri":"http://localhost:8080",
    "client_id":"3YfTh7XFUa7vtNuxUkSwa5HziyquYTI3",
    "code_verifier":"FLy2h8AP4IXo5~Od~Aeei7yJvcmwxjTs_Kv5O-e-1ah",
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
```

## ID token

The ID token is a Json Web Token, JWT, and consists of a base64 encoded header, payload and signature. Validation of JWT involves encoding the header and payload with information found in the JWT and comparing it with the signature. Its specifics are beyond the scope of this article but the procedure is described in [RFC7519](https://tools.ietf.org/html/rfc7519#section-7.2). The long sought after user information can be seen by base64 decoding the payload. Alternatively you may use [jwt.io](https://jwt.io/#debugger-io?token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijg1c1ZGNW5Vdl9CS2tiWF9pTUVzTSJ9.eyJnaXZlbl9uYW1lIjoiS2ltIFJ1bmUiLCJmYW1pbHlfbmFtZSI6IlNvbHN0YWQiLCJuaWNrbmFtZSI6ImtpbXJ1bmVzb2xzdGFkODkiLCJuYW1lIjoiS2ltIFJ1bmUgU29sc3RhZCIsInBpY3R1cmUiOiJodHRwczovL2xoNC5nb29nbGV1c2VyY29udGVudC5jb20vLVRZeVduLTRQX3RrL0FBQUFBQUFBQUFJL0FBQUFBQUFBQUFBL0FNWnV1Y21DU05zeE9nVGRaa05PR1BjLWQ5aG56RGNfV3cvcGhvdG8uanBnIiwibG9jYWxlIjoibm8iLCJ1cGRhdGVkX2F0IjoiMjAyMC0wOS0yOFQxMjoyNjo0Ni43OTBaIiwiaXNzIjoiaHR0cHM6Ly9zb2Jlci5ldS5hdXRoMC5jb20vIiwic3ViIjoiZ29vZ2xlLW9hdXRoMnwxMTA0MzEyMTE3NzQ4MjgzMTA3MTIiLCJhdWQiOiJCSzdpUzMyWTlRYW5qZEdDTFprNDk5REozMHQ3anAwTiIsImlhdCI6MTYwMTI5NjE0MSwiZXhwIjoxNjAxMzMyMTQxLCJub25jZSI6IjJ2Y2pqbGR1eXpjIn0.hPKkDXd7zX8IDXBmxv7yzzmp9sdxqTTaGF3Ml5sRvkCf_89hr72B62w5sprBgz7jjF4HcvgypN9BMaxFNUM0SHjtbQKvYj5yUgZim7b7QbmyJh1Pu-YppVXhVuDwiDj0aWuRzFyxfEW39ZksYVJ3BcEhSl1ejq0-egkgiYVHMGu52enR5mr2vd3fNEjZDhDFAouL2XX1LWERxHTuSvICnhxjrmmBQ_rBs65eK9zmRGf8GM3VTPU00N7W6VE6CkA8swsV0SxSSOdPZzS8TJPIX6jHxbz9mdF31EVv43a2oEH8S3MfOf2a6yznWKP_UcAW2SgDDLb6xW1vEAZe-93QiA&publicKey=-----BEGIN%20PUBLIC%20KEY-----%0AMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAo20nae36OLb2itnd6tUy%0AotU2%2FtfAhKhZqatn4CiOyymRFxWktad4xzu65Kuwv0ggxUqyciLMlR0PTgDItas%2F%0Azdxjg8FhUkoepcq69l0GR3OtRBYBIGq%2BZ0c9TRp%2FDSw7YAN8TIcqlI90MTGljTHk%0AcRJpLlS6kdh7wlGFmeFXcRUqBbkzvsoHxfJspD25X7DCey02CczJ8hfIjnlKCdH4%0AxTvkL3KlWDxwI1xQc9nCq2TrsBe%2F4l428VY8FXRi0%2BuPgM7SKQepBeUw37G%2FOndK%0AnBmPxyQ452G62ML3ZkSvEN0hQ4q6d%2FRxHHsdwcti6xayE0SPoHEzECzekGm9Q0k%2B%0AsQIDAQAB%0A-----END%20PUBLIC%20KEY-----%0A)

```Bash
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
## Conclusion
After explaining the basis of OAuth 2.0 and OpenID Connect we went through use cases for three different grant types, namely client credentials, authorization code and PKCE. PKCE flow adds an extra layer of security compared to the deprecated implicit flow. I am however not sure about the added layer of security PKCE provides. It seems to me that anyone capable of retrieving the authorization could easily get the code verifier aswell. I might have to investigate this for a future blog post.

## Resources
* https://tools.ietf.org/html/rfc7636#section-4.1

* https://tools.ietf.org/html/rfc7519#section-7.2

* https://tools.ietf.org/html/draft-ietf-oauth-browser-based-apps-00#section-7
https://tools.ietf.org/html/rfc8414

* https://developer.okta.com/blog/2019/05/01/is-the-oauth-implicit-flow-dead

* https://www.youtube.com/watch?v=996OiexHze0\

* https://auth0.com/docs/flows/authorization-code-flow-with-proof-key-for-code-exchange-pkce