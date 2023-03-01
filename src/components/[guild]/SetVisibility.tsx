import {
  ButtonProps,
  Circle,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalProps,
  useDisclosure,
} from "@chakra-ui/react"
import Button from "components/common/Button"
import RadioSelect from "components/common/RadioSelect"
import { Option } from "components/common/RadioSelect/RadioSelect"
import { Eye, EyeClosed, EyeSlash, IconProps } from "phosphor-react"
import { ForwardRefExoticComponent, RefAttributes, useRef } from "react"
import { useController, useFormContext, useWatch } from "react-hook-form"
import { Visibility } from "types"

export const visibilityData: Record<
  Visibility,
  Partial<Option> & {
    Icon: React.ForwardRefExoticComponent<
      IconProps & React.RefAttributes<SVGSVGElement>
    >
  }
> = {
  [Visibility.PUBLIC]: {
    title: "Public",
    Icon: Eye,
    description: "Visible to everyone",
  },
  [Visibility.PRIVATE]: {
    title: "Private",
    Icon: EyeSlash,
    description: "Only visible to role holders",
  },
  [Visibility.HIDDEN]: {
    title: "Hidden",
    Icon: EyeClosed,
    description: "Only visible to admins",
  },
}

const VisibilityTag = ({ visibility }: { visibility: Visibility }) => {
  const { Icon, title } = visibilityData[visibility]

  return (
    <Button
      size={"xs"}
      colorScheme={"blackAlpha" as ButtonProps["colorScheme"]}
      leftIcon={<Icon />}
      isDisabled
      opacity={"1 !important"}
    >
      {title}
    </Button>
  )
}

const visibilityDataFromRoleVisibility: Record<
  Exclude<Visibility, "HIDDEN">,
  Partial<Record<Exclude<Visibility, "PUBLIC">, Partial<Option>>>
> = {
  [Visibility.PUBLIC]: {
    [Visibility.PRIVATE]: {
      tooltipLabel: (
        <>
          Make the role <VisibilityTag visibility={Visibility.PUBLIC} /> first.{" "}
          Requirements and rewards can't behave as{" "}
          <VisibilityTag visibility={Visibility.PUBLIC} /> in a{" "}
          <VisibilityTag visibility={Visibility.PRIVATE} /> role
        </>
      ),
      disabled: true,
    },
    [Visibility.HIDDEN]: {
      tooltipLabel: (
        <>
          Make the role <VisibilityTag visibility={Visibility.PUBLIC} /> first.{" "}
          Requirements and rewards can't behave as{" "}
          <VisibilityTag visibility={Visibility.PUBLIC} /> in a{" "}
          <VisibilityTag visibility={Visibility.HIDDEN} /> role
        </>
      ),
      disabled: true,
    },
  },
  [Visibility.PRIVATE]: {
    [Visibility.HIDDEN]: {
      tooltipLabel: (
        <>
          Make the role <VisibilityTag visibility={Visibility.PRIVATE} /> first.
          Requirements and rewards can't behave as{" "}
          <VisibilityTag visibility={Visibility.PRIVATE} /> in a{" "}
          <VisibilityTag visibility={Visibility.HIDDEN} /> role
        </>
      ),
      disabled: true,
    },
  },
}

type FilterableEntity = "role" | "requirement" | "reward"

const SetVisibility = (props: {
  entityType: FilterableEntity
  fieldBase?: string
}) => {
  const parentField = props.fieldBase ?? ""
  const { isOpen, onClose, onOpen } = useDisclosure()

  const buttonRef = useRef()

  const currentVisibility: Visibility = useWatch({
    name: `${parentField}.visibility`,
  })

  if (!currentVisibility) {
    return null
  }

  const Icon = visibilityData[currentVisibility].Icon

  return (
    <>
      <Button ml={3} size="xs" leftIcon={<Icon />} onClick={onOpen} ref={buttonRef}>
        {visibilityData[currentVisibility].title}
      </Button>

      <SetVisibilityModal
        {...props}
        fieldBase={parentField}
        isOpen={isOpen}
        onClose={onClose}
        finalFocusRef={buttonRef}
      />
    </>
  )
}

const getLeftSideIcon =
  (Icon: ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>) =>
  () =>
    (
      <Circle bg={"gray.600"} p={3} ml={"0 !important"} mr={"3 !important"}>
        <Icon />
      </Circle>
    )

const SetVisibilityModal = ({
  entityType,
  fieldBase = "",
  isOpen,
  onClose,
  ...modalProps
}: {
  entityType: "role" | "requirement" | "reward"
  fieldBase?: string
  isOpen: boolean
  onClose: () => void
} & Partial<ModalProps>) => {
  const visibilityField = `${fieldBase}.visibility`
  const { field } = useController({ name: visibilityField })

  const saveAndClose = () => {
    onClose()
  }

  const requirements = useWatch({ name: "requirements" })
  const rolePlatforms = useWatch({ name: "rolePlatforms" })
  const { setValue } = useFormContext()
  const roleVisibility = useWatch({ name: ".visibility" })

  const mapToAtLeastPrivate = (entities, base) =>
    entities.forEach(({ visibility }, index) => {
      if (visibility === Visibility.PUBLIC) {
        setValue(`${base}.${index}.visibility`, Visibility.PRIVATE)
      }
    })

  const mapToHidden = (entities, base) =>
    entities.forEach(({ visibility }, index) => {
      if (visibility !== Visibility.HIDDEN) {
        setValue(`${base}.${index}.visibility`, Visibility.HIDDEN)
      }
    })

  const onChange = (newValue: Visibility) => {
    if (entityType === "role") {
      if (newValue === Visibility.PRIVATE) {
        mapToAtLeastPrivate(requirements, "requirements")
        mapToAtLeastPrivate(rolePlatforms, "rolePlatforms")
      } else if (newValue === Visibility.HIDDEN) {
        mapToHidden(requirements, "requirements")
        mapToHidden(rolePlatforms, "rolePlatforms")
      }
    }

    setValue(visibilityField, newValue)
  }

  return (
    <Modal isOpen={isOpen} onClose={saveAndClose} size="lg" {...modalProps}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Change {entityType} visibility</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <RadioSelect
            colorScheme="indigo"
            options={Object.entries(visibilityData).map(
              ([value, { Icon, ...options }]) => ({
                value,
                ...options,
                RightComponent: getLeftSideIcon(Icon),
                ...(entityType === "role"
                  ? {}
                  : visibilityDataFromRoleVisibility[value]?.[roleVisibility] ?? {}),
              })
            )}
            {...field}
            onChange={onChange}
          />
        </ModalBody>

        <ModalFooter>
          <HStack justifyContent={"end"}>
            <Button colorScheme={"green"} onClick={saveAndClose}>
              Done
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default SetVisibility
