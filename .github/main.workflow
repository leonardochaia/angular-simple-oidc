workflow "Run tests on push" {
  on = "push"
  resolves = ["Run tests"]
}

action "Install packages" {
  uses = "Borales/actions-yarn"
  args = "install"
}

action "Run tests" {
  uses = "Borales/actions-yarn"
  needs = ["Install packages"]
  args = "test-lib-ci"
}
