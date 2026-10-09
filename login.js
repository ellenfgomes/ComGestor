const CLERK_PUBLISHABLE_KEY =
  "pk_test_YWJsZS1sYW1iLTE1NjEuY2xlcmsuYWNjb3VudHMuZGV2JA";

const CLERK_DOMAIN =
  "https://able-lamb-1561.clerk.accounts.dev";

const loginContainer =
  document.getElementById("clerk-login");

const errorBox =
  document.getElementById("login-error");

const loadingBox =
  document.getElementById("login-loading");


function showError(message) {
  errorBox.textContent = message;
  errorBox.style.display = "block";
}


function hideError() {
  errorBox.textContent = "";
  errorBox.style.display = "none";
}


function showLoading() {
  loadingBox.style.display = "block";
}


function hideLoading() {
  loadingBox.style.display = "none";
}


async function iniciarLogin() {

  try {

    hideError();
    showLoading();

    console.log("1. Iniciando Clerk...");

    /*
      Confirma se o Clerk foi carregado
      pelos scripts do HTML.
    */
    if (!window.Clerk) {

      throw new Error(
        "ClerkJS não foi carregado."
      );

    }

    console.log(
      "2. Clerk encontrado."
    );

    /*
      Inicializa o Clerk.
    */
    await window.Clerk.load({
      ui: {
        ClerkUI:
          window.__internal_ClerkUICtor
      }
    });

    console.log(
      "3. Clerk carregado."
    );

    /*
      Caso já esteja autenticado,
      não mostra novamente o login.
    */
    if (
      window.Clerk.isSignedIn &&
      window.Clerk.session
    ) {

      console.log(
        "4. Usuário já autenticado."
      );

      await verificarUsuario();

      return;
    }

    /*
      Mostra o login oficial do Clerk.
    */
    console.log(
      "4. Montando tela de login..."
    );

    window.Clerk.mountSignIn(
      loginContainer,
      {
        appearance: {
          layout: {
            socialButtonsPlacement: "top",
            socialButtonsVariant: "blockButton"
          },
          variables: {
            colorPrimary: "#2563eb"
          }
        }
      }
    );

    console.log(
      "5. Tela de login montada."
    );

    hideLoading();

    /*
      Quando o usuário terminar o login,
      verificamos o cadastro no ComGestor.
    */
    window.Clerk.addListener(
      async ({ session }) => {

        if (
          session &&
          window.Clerk.isSignedIn
        ) {

          await verificarUsuario();

        }

      }
    );

  } catch (error) {

    console.error(
      "ERRO CLERK:",
      error
    );

    hideLoading();

    showError(
      "Não foi possível iniciar o login. " +
      "Verifique a configuração do Clerk."
    );
  }
}


async function verificarUsuario() {

  try {

    showLoading();
    hideError();

    console.log(
      "6. Obtendo token do Clerk..."
    );

    const token =
      await window.Clerk.session.getToken({
        template: "convex"
      });

    if (!token) {

      throw new Error(
        "Token do Clerk não encontrado."
      );

    }

    console.log(
      "7. Token recebido."
    );

    /*
      IMPORTANTE:
      nesta etapa estamos apenas verificando
      a autenticação do Clerk.

      Depois ligamos essa autenticação
      diretamente ao usuário do Convex.
    */

    sessionStorage.setItem(
      "comgestor_auth",
      "true"
    );

    sessionStorage.setItem(
      "comgestor_token",
      token
    );

    console.log(
      "8. Login realizado."
    );

    /*
      Entra no ComGestor.
    */
  
window.location.href = "/ComGestor/index.html";
  } catch (error) {

    console.error(
      "ERRO AO VALIDAR USUÁRIO:",
      error
    );

    showError(
      "Seu login foi realizado, mas não foi possível " +
      "validar seu acesso ao ComGestor."
    );

    hideLoading();
  }

}


window.addEventListener(
  "load",
  iniciarLogin
);
