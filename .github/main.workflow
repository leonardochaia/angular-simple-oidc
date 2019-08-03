workflow "Run tests on push" {
  on = "push"
  resolves = ["Run tests"]
}

action "Install packages" {
  uses = "Borales/actions-yarn@master"
  args = "install"
}

action "Run tests" {
  uses = "Borales/actions-yarn@master"
  needs = ["Install packages"]
  args = "test-lib-ci"
}
