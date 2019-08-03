workflow "Run tests on push" {
  on = "push"
  resolves = ["Run tests"]
}

action "Install packages" {
  uses = "Borales/actions-yarn@master"
  args = "install"
  runs = "yarn"
}

action "Run tests" {
  uses = "ianwalter/puppeteer@v2.0.0"
  needs = ["Install packages"]
  args = "test-lib-ci"
  runs = "yarn"
}
