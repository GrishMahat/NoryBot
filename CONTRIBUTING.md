# Contributing to NoryBot

First off, thank you for considering contributing to NoryBot! It's people like you that make NoryBot such a great tool.

## Where do I go from here?

If you've noticed a bug or have a feature request, [make one](https://github.com/grish-xd/NoryBot/issues/new/choose)! It's generally best if you get confirmation of your bug or approval for your feature request this way before starting to code.

### Fork & create a branch

If this is something you think you can fix, then [fork NoryBot](https://github.com/grish-xd/NoryBot/fork) and create a branch with a descriptive name.

A good branch name would be (where issue #38 is the ticket you're working on):

```sh
git checkout -b 38-add-awesome-new-feature
```

### Get the project running

At this point, you're ready to make your changes! Feel free to ask for help; everyone is a beginner at first :smile_cat:

1.  Clone your forked repository:
    ```sh
    git clone https://github.com/your-username/NoryBot.git
    ```
2.  Go to the project directory:
    ```sh
    cd NoryBot
    ```
3.  Install the dependencies:
    ```sh
    pnpm install
    ```
4.  Create a `.env` file and fill it with the required values from `.env.example`.

5.  Run the bot in development mode:
    ```sh
    pnpm dev
    ```

### Make your changes

Now, go to town on your feature or bug fix!

This project uses [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/) to maintain code quality and consistency. Please make sure your code adheres to the project's linting and formatting rules. The pre-commit hook should handle this automatically for you.

### Commit your changes

Make sure your commit messages are in the [conventional commit](https://www.conventionalcommits.org/en/v1.0.0/) format. This helps us automatically generate changelogs.

Example:

```
feat: add a new command for user profiles
```

### Pull Request

When you're done with the changes, create a pull request, also known as a PR.

-   Don't forget to [link PR to issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue) if you are solving one.
-   Enable the checkbox to [allow maintainer edits](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/allowing-changes-to-a-pull-request-branch-created-from-a-fork) so the branch can be updated for a merge.
Once you submit your PR, a team member will review your proposal. We may ask questions or request for additional information.
-   We may ask for changes to be made before a PR can be merged, either using [suggested changes](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/incorporating-feedback-in-your-pull-request) or pull request comments. You can apply suggested changes directly through the UI. You can make any other changes in your fork, then commit them to your branch.
-   As you update your PR and apply changes, mark each conversation as [resolved](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/commenting-on-a-pull-request#resolving-conversations).
-   If you run into any merge issues, checkout this [git tutorial](https://github.com/skills/resolve-merge-conflicts) to help you resolve merge conflicts and other issues.

### Your PR is merged!

Congratulations :tada::tada: The NoryBot team thanks you :sparkles:.

Once your PR is merged, your contributions will be publicly visible on the NoryBot project.

