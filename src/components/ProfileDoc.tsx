// 프로필 문서는 src/components/profile/ 에 있다. 기존 import 경로를 살리기 위한 재수출.
export { ProfileDocView } from './profile/ProfileView'
export { ProfileDocEditor } from './profile/ProfileEditor'
export { PROFILE_DOC_BYTES, docBytes, emptyDoc, isEmptyDoc, parseProfileDoc, type ProfileDoc } from './profile/model'
