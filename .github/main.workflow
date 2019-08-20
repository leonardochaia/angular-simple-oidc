workflow "Run tests on push" {
  on = "push"
  resolves = [
    "Test angular-simple-oidc",
    "Build angular-simple-oidc",
    "Build sample app"
  ]
}

action "Install packages" {
  uses = "Borales/actions-yarn@master"
  args = "install"
  runs = "yarn"
}

action "Build angular-simple-oidc" {
  uses = "Borales/actions-yarn@master"
  needs = ["Install packages"]
  runs = "yarn"
  args = "build angular-simple-oidc"
}

action "Test angular-simple-oidc" {
  uses = "ianwalter/puppeteer@v2.0.0"
  needs = ["Build angular-simple-oidc"]
  args = "test-lib-ci"
  runs = "yarn"
}

action "Build sample app" {
  uses = "Borales/actions-yarn@master"
  needs = ["Build angular-simple-oidc"]
  runs = "yarn"
  args = "build build --prod"
}
