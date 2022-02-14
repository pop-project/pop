import {StoryMocks} from 'src/lib/StoryMocks'
import RegisterLayout from '../RegisterLayout'
import PhotoPage from './PhotoPage'

export const Take_Photo = () => (
  <StoryMocks user={{user: {id: 1}}}>
    <RegisterLayout>
      <PhotoPage />
    </RegisterLayout>
  </StoryMocks>
)

export const Review = () => (
  <StoryMocks
    user={{user: {id: 1}}}
    state={{
      register: {
        photo: 'bafybeicxoq24v5sxcz4myt5kx35kluclpoqhsfb2qdf5oevfuklprux2em',
      },
    }}
  >
    <RegisterLayout>
      <PhotoPage />
    </RegisterLayout>
  </StoryMocks>
)

export default {title: 'Pages/Register/4. Photo'}
