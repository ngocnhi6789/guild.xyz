import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerOverlay,
  FormLabel,
  GridItem,
  HStack,
  Icon,
  IconButton,
  SimpleGrid,
  Text,
  useBreakpointValue,
  useDisclosure,
  VStack,
} from "@chakra-ui/react"
import DiscardAlert from "components/common/DiscardAlert"
import DrawerHeader from "components/common/DrawerHeader"
import OnboardingMarker from "components/common/OnboardingMarker"
import Section from "components/common/Section"
import Description from "components/create-guild/Description"
import DynamicDevTool from "components/create-guild/DynamicDevTool"
import IconSelector from "components/create-guild/IconSelector"
import Name from "components/create-guild/Name"
import SetRequirements from "components/create-guild/Requirements"
import useGuild from "components/[guild]/hooks/useGuild"
import { useOnboardingContext } from "components/[guild]/Onboarding/components/OnboardingProvider"
import usePinata from "hooks/usePinata"
import useSubmitWithUpload from "hooks/useSubmitWithUpload"
import useWarnIfUnsavedChanges from "hooks/useWarnIfUnsavedChanges"
import { Check, PencilSimple, Plus } from "phosphor-react"
import { useRef } from "react"
import { FormProvider, useFieldArray, useForm } from "react-hook-form"
import { Role } from "types"
import getRandomInt from "utils/getRandomInt"
import mapRequirements from "utils/mapRequirements"
import DeleteRoleButton from "./components/DeleteRoleButton"
import PlatformCard from "./components/PlatformCard"
import * as EditDiscord from "./components/PlatformCard/components/EditDiscordPlatform"
import { RolePlatformProvider } from "./components/RolePlatformProvider"
import useEditRole from "./hooks/useEditRole"

type Props = {
  roleData: Role
}

const rolePlatformEdit = {
  DISCORD: EditDiscord,
}

const EditRole = ({ roleData }: Props): JSX.Element => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const drawerSize = useBreakpointValue({ base: "full", md: "xl" })
  const btnRef = useRef()

  const { roles, platforms, imageUrl } = useGuild()
  const {
    id,
    name,
    description,
    logic,
    requirements,
    platforms: rolePlatforms,
  } = roleData

  const defaultValues = {
    roleId: id,
    name,
    description,
    imageUrl,
    logic,
    requirements: mapRequirements(requirements),
    rolePlatforms: rolePlatforms,
  }
  const methods = useForm({
    mode: "all",
    defaultValues,
  })

  const { fields, remove } = useFieldArray({
    control: methods.control,
    name: "rolePlatforms",
  })

  const onSuccess = () => {
    onClose()
    methods.reset(undefined, { keepValues: true })
  }

  const { onSubmit, isLoading, isSigning } = useEditRole(id, onSuccess)

  useWarnIfUnsavedChanges(
    methods.formState?.isDirty && !methods.formState.isSubmitted
  )

  const {
    isOpen: isAlertOpen,
    onOpen: onAlertOpen,
    onClose: onAlertClose,
  } = useDisclosure()

  const onCloseAndClear = () => {
    methods.reset(defaultValues)
    onAlertClose()
    onClose()
  }

  const iconUploader = usePinata({
    onSuccess: ({ IpfsHash }) => {
      methods.setValue(
        "imageUrl",
        `${process.env.NEXT_PUBLIC_IPFS_GATEWAY}${IpfsHash}`,
        {
          shouldTouch: true,
        }
      )
    },
    onError: () => {
      methods.setValue("imageUrl", `/guildLogos/${getRandomInt(286)}.svg`, {
        shouldTouch: true,
      })
    },
  })

  const { handleSubmit, isUploadingShown } = useSubmitWithUpload(
    methods.handleSubmit(onSubmit),
    iconUploader.isUploading
  )

  const loadingText = (): string => {
    if (isSigning) return "Check your wallet"
    if (isUploadingShown) return "Uploading image"
    return "Saving data"
  }

  const { localStep } = useOnboardingContext()

  return (
    <>
      <OnboardingMarker step={0} onClick={onOpen}>
        <IconButton
          ref={btnRef}
          icon={<Icon as={PencilSimple} />}
          size="sm"
          rounded="full"
          aria-label="Edit role"
          data-dd-action-name={
            localStep === null ? "Edit role" : "Edit role [onboarding]"
          }
          onClick={onOpen}
        />
      </OnboardingMarker>

      <Drawer
        isOpen={isOpen}
        placement="left"
        size={drawerSize}
        onClose={methods.formState.isDirty ? onAlertOpen : onClose}
        finalFocusRef={btnRef}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerBody className="custom-scrollbar">
            <DrawerHeader title="Edit role">
              {roles?.length > 1 && <DeleteRoleButton roleId={id} />}
            </DrawerHeader>
            <FormProvider {...methods}>
              <Section
                title="Platforms"
                spacing="6"
                mb={5}
                titleRightElement={
                  <HStack flexGrow={1} justifyContent={"end"}>
                    <Button
                      variant="ghost"
                      size="sm"
                      color="gray.400"
                      leftIcon={<Plus />}
                      onClick={() => console.log("TODO: add platform")}
                    >
                      Add platform
                    </Button>
                  </HStack>
                }
              >
                {(fields.length > 0 && (
                  <SimpleGrid columns={2} gap={10}>
                    {fields.map((rolePlatform, index) => {
                      // TODO: type should come from rolePlatform, not from platforms
                      const EditComponent = rolePlatformEdit[platforms?.[0]?.type]

                      const card = (
                        <RolePlatformProvider
                          rolePlatform={{
                            ...rolePlatform,
                            // These should be available in rolePlatform
                            nativePlatformId: platforms?.[0]?.platformId,
                            type: platforms?.[0]?.type,
                          }}
                        >
                          <PlatformCard
                            key={rolePlatform.roleId}
                            imageUrl={imageUrl}
                            name={name}
                            EditModal={EditComponent.Modal}
                            onRemove={() => remove(index)}
                          >
                            {EditComponent && <EditComponent.Label />}
                          </PlatformCard>
                        </RolePlatformProvider>
                      )

                      if (!!EditComponent) {
                        return <GridItem colSpan={2}>{card}</GridItem>
                      }
                      return card
                    })}
                  </SimpleGrid>
                )) || <Text color={"gray.400"}>No Platforms</Text>}
              </Section>

              <VStack spacing={10} alignItems="start">
                <Section title="General" spacing="6">
                  <Box>
                    <FormLabel>Logo and name</FormLabel>
                    <HStack spacing={2} alignItems="start">
                      <IconSelector uploader={iconUploader} />
                      <Name />
                    </HStack>
                  </Box>
                  <Description />
                  <SetRequirements maxCols={2} />
                </Section>
              </VStack>
            </FormProvider>
          </DrawerBody>

          <DrawerFooter>
            <Button variant="outline" mr={3} onClick={onCloseAndClear}>
              Cancel
            </Button>
            <Button
              disabled={isLoading || isSigning || isUploadingShown}
              isLoading={isLoading || isSigning || isUploadingShown}
              colorScheme="green"
              loadingText={loadingText()}
              onClick={handleSubmit}
              leftIcon={<Icon as={Check} />}
            >
              Save
            </Button>
          </DrawerFooter>
        </DrawerContent>
        <DynamicDevTool control={methods.control} />
      </Drawer>

      <DiscardAlert
        {...{
          isOpen: isAlertOpen,
          onClose: onAlertClose,
          onDiscard: onCloseAndClear,
        }}
      />
    </>
  )
}

export default EditRole
