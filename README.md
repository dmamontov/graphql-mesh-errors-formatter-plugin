# Errors Formatter Plugin for GraphQL Mesh

Errors Formatter Plugin is a plugin for GraphQL Mesh that allows you to format error messages consistently across your services. It enhances error handling by enabling the specification of error codes and transforming all errors to match the Apollo Server error format, making your GraphQL API's error responses more predictable and manageable.

## Installation

Before you can use the Errors Formatter Plugin, you need to install it along with GraphQL Mesh if you haven't already done so. You can install these using npm or yarn.

```bash
npm install @dmamontov/graphql-mesh-errors-formatter-plugin
```

or

```bash
yarn add @dmamontov/graphql-mesh-errors-formatter-plugin
```

## Configuration

### Modifying tsconfig.json

To make TypeScript recognize the Errors Formatter Plugin, you need to add an alias in your tsconfig.json.

Add the following paths configuration under the compilerOptions in your tsconfig.json file:

```json
{
  "compilerOptions": {
    "paths": {
       "errors-formatter": ["node_modules/@dmamontov/graphql-mesh-errors-formatter-plugin"]
    }
  }
}
```

### Adding the Plugin to GraphQL Mesh

You need to include the Errors Formatter Plugin in your GraphQL Mesh configuration file (usually .meshrc.yaml). Below is an example configuration that demonstrates how to use this plugin:

```yaml
plugins:
  - errorsFormatter:
      enabled: true
      sources:
        - sourceName: Users
          typeName: Query
          fields: [user, users]
          formatters:
            - match: "^unknown error$"
              code: UNKNOWN
            - match: "^user: (\\d+) not found$"
              message: "User (id: $1) not found"
              code: NOT_FOUND
              context:
                user_id: "$1"
```

## Conclusion

Remember, always test your configurations in a development environment before applying them in production to ensure that everything works as expected.