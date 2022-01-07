import {Button, ButtonGroup} from '@chakra-ui/button'
import {FormControl, FormHelperText, FormLabel} from '@chakra-ui/form-control'
import {Heading, Stack} from '@chakra-ui/layout'
import {Input} from '@chakra-ui/react'
import {Form, useForm} from '@redwoodjs/forms'
import {navigate, Redirect, routes} from '@redwoodjs/router'
import {
  CellSuccessProps,
  createCell,
  MetaTags,
  useMutation,
} from '@redwoodjs/web'
import React, {useContext} from 'react'
import {Card} from 'src/components/Card'
import requireEthAddress from 'src/components/requireEthAddress'
// import RequireEthAddress from 'src/components/RequireEthAddress'
import UserContext from 'src/layouts/UserContext'
import ProfileStatus from 'src/pages/SignUp/ProfileStatus'
import {SignUpSubmittedPageQuery} from 'types/graphql'

const Success = (props: CellSuccessProps<SignUpSubmittedPageQuery>) => {
  const {ethereumAddress} = useContext(UserContext)

  const methods = useForm<{email: string}>({
    defaultValues: {
      email: props.unsubmittedProfile?.hasEmail ? '***@***.***' : null,
    },
  })

  const [saveEmail] = useMutation(gql`
    mutation UnsubmittedProfileSetEmailMutation(
      $ethereumAddress: String!
      $email: String!
    ) {
      unsubmittedProfileSetEmail(
        ethereumAddress: $ethereumAddress
        email: $email
      ) {
        ethereumAddress
      }
    }
  `)

  const onSubmit = async (data) => {
    await saveEmail({
      variables: {
        ethereumAddress,
        email: data.email,
      },
    })
    // Clear the form isDirty
    methods.reset(data)
  }

  if (props.unsubmittedProfile === null) {
    return <Redirect to={routes.signUpEdit()} />
  }

  return (
    <Stack maxW="xl" mx="auto">
      {/* @ts-expect-error TODO: typechecking for redwood forms */}
      <Form formMethods={methods} onSubmit={onSubmit}>
        <Stack spacing="6">
          <MetaTags title="Profile Pending Approval" />
          <Heading size="lg">Profile Pending Approval</Heading>
          <ProfileStatus profile={props.unsubmittedProfile} />
          <ButtonGroup alignSelf="flex-end">
            <Button onClick={() => navigate(routes.signUpEdit())}>
              Edit Profile
            </Button>
          </ButtonGroup>

          <Card>
            <FormControl>
              <FormLabel>Email</FormLabel>
              <Input type="email" {...methods.register('email')} />
              <FormHelperText>
                If you'd like to get updates when your profile is approved or
                reviewed, enter your email here.
              </FormHelperText>
            </FormControl>
            <Button
              type="submit"
              colorScheme="blue"
              mt="6"
              disabled={!methods.formState.dirtyFields.email}
            >
              {methods.formState.isSubmitted ? 'Saved' : 'Save'}
            </Button>
          </Card>
        </Stack>
      </Form>
    </Stack>
  )
}

const Cell = createCell({
  QUERY: gql`
    query SignUpSubmittedPageQuery($ethereumAddress: ID!) {
      unsubmittedProfile(ethereumAddress: $ethereumAddress) {
        hasEmail
        UnaddressedFeedback {
          feedback
        }
      }
    }
  `,
  Success,
})

export default requireEthAddress(<Cell />)